import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const config = JSON.parse(execFileSync("pnpm", ["dlx","supabase","status","--workdir","tools/dev-sandbox","--output","json"], {encoding:"utf8",stdio:["ignore","pipe","ignore"]}));
assert.equal(new URL(config.API_URL).port, "55321");
const admin = createClient(config.API_URL,config.SERVICE_ROLE_KEY);
const cookies = new Map();
const client = createServerClient(config.API_URL,config.ANON_KEY,{
  cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll: values=>values.forEach(({name,value})=>cookies.set(name,value))},
});
const email = process.env.MANAGEMENT_DEV_EMAIL || `management-${randomUUID()}@example.test`;
const password = process.env.MANAGEMENT_DEV_PASSWORD || randomBytes(24).toString("base64url");
const created = await admin.auth.admin.createUser({email,password,email_confirm:true});
let user = created.data.user;
if (!user) {
  const {data,error}=await client.auth.signInWithPassword({email,password});
  assert.ifError(error); user=data.user;
} else {
  const {error}=await client.auth.signInWithPassword({email,password});assert.ifError(error);
}
const ok = async query => { const {data,error}=await query; assert.ifError(error); return data; };
const stamp = Date.now();
const brand = (await ok(admin.from("brands").insert({name:"검증 브랜드"}).select().single())).id;
const category = (await ok(admin.from("categories").insert({name:"검증 분류"}).select().single())).id;
const warehouse = (await ok(admin.from("warehouses").insert({name:"검증 창고 "+stamp}).select().single())).id;
const warehouse2 = (await ok(admin.from("warehouses").insert({name:"검증 보조창고 "+stamp}).select().single())).id;
await ok(admin.from("profiles").upsert({id:user.id,name:"개발 검증 사용자",email}));
const form = (name,type="company",quantity=0)=>({name,product_type:type,quantity,warehouse_id:warehouse,brand_id:brand,category_id:category,weight:1000,unit_label:"g",sku:name+"-"+stamp});
const product = await ok(client.rpc("register_product",{p_form:form("검증 완제품")}));
const material = await ok(client.rpc("register_product",{p_form:form("검증 원재료","material",2500)}));
assert.equal(material.inventory.weight_in_grams,2500); assert.equal(material.inventory.quantity,null);
console.log("PASS atomic product registration and material grams");
const failedForm={...form("부분등록실패"),sku:product.option.sku};
assert.ok((await client.rpc("register_product",{p_form:failedForm})).error);
assert.equal((await ok(admin.from("products").select("id").eq("name","부분등록실패"))).length,0);
console.log("PASS option failure rolls back product");
const option=product.option.id;
const makeTx = (type,quantity,id=option,location=warehouse)=>client.rpc("create_transaction",{
 p_header:{type,warehouse_id:location,user_id:"00000000-0000-0000-0000-000000000000",memo:"목록에서 바로 보이는 메모\n두 번째 줄"},
 p_items:[{option_id:id,quantity,product_type:"company"}],
});
const inbound = (await ok(makeTx("in",10))).transaction_id;
const outbound = (await ok(makeTx("out",4))).transaction_id;
const stock = async(id=option,location=warehouse)=> {
 const row=await ok(admin.from("inventory").select("quantity,weight_in_grams").eq("product_option_id",id).eq("warehouse_id",location).single());
 return id===material.option.id?row.weight_in_grams:row.quantity;
};
assert.equal(await stock(),6);
assert.equal((await ok(admin.from("transactions").select("user_id").eq("id",inbound).single())).user_id,user.id);
const changes=(quantity,location=warehouse,id=option)=>({
 warehouse_id:location,supplier_id:null,memo:"수정한 메모\n상세를 열지 않아도 보여요",created_at:new Date().toISOString(),items:[{option_id:id,quantity}],
});
const update=(id,revision,body)=>client.rpc("manage_transaction",{p_id:id,p_revision:revision,p_changes:body,p_delete:false});
const cancel=(id,revision)=>client.rpc("manage_transaction",{p_id:id,p_revision:revision,p_changes:{},p_delete:true});
await ok(update(inbound,0,changes(8))); assert.equal(await stock(),4);
assert.ok((await update(inbound,0,changes(7))).error); assert.equal(await stock(),4);
console.log("PASS quantity edit, authenticated actor and stale revision conflict");
await ok(cancel(outbound,0)); assert.equal(await stock(),8);
await ok(cancel(outbound,0)); assert.equal(await stock(),8);
assert.equal((await ok(admin.from("transaction_history_view").select("*").eq("transaction_id",outbound))).length,0);
console.log("PASS cancel restores inventory exactly once and hides history");
await ok(update(inbound,1,changes(8,warehouse2))); assert.equal(await stock(),0);assert.equal(await stock(option,warehouse2),8);
console.log("PASS warehouse edit reverses old location and applies new location");
const competing=await Promise.all([update(inbound,2,changes(9,warehouse2)),update(inbound,2,changes(10,warehouse2))]);
assert.equal(competing.filter(r=>!r.error).length,1);
assert.equal(competing.filter(r=>r.error?.code==="40001").length,1);
await ok(update(inbound,3,changes(8,warehouse2)));
console.log("PASS concurrent edits accept exactly one revision");
const consumed=(await ok(makeTx("out",7,option,warehouse2))).transaction_id;
assert.ok((await cancel(inbound,4)).error);assert.equal(await stock(option,warehouse2),1);
assert.equal((await ok(admin.from("transactions").select("revision").eq("id",inbound).single())).revision,4);
console.log("PASS insufficient stock cancels entire operation");
await ok(cancel(consumed,0));
const outMulti=(await ok(makeTx("out",1,option,warehouse2))).transaction_id;
const beforeStock=await stock(option,warehouse2);
assert.ok((await update(outMulti,0,{...changes(2,warehouse2),items:[{option_id:option,quantity:2},{option_id:material.option.id,quantity:99999999}]})).error);
assert.equal(await stock(option,warehouse2),beforeStock);
console.log("PASS multi-item failure rolls back every inventory delta");
await ok(cancel(outMulti,0));
const materialOut=(await ok(makeTx("out",500,material.option.id))).transaction_id;
assert.equal(await stock(material.option.id),2000);
await ok(update(materialOut,0,changes(250,warehouse,material.option.id)));
assert.equal(await stock(material.option.id),2250);
await ok(cancel(materialOut,1)); assert.equal(await stock(material.option.id),2500);
console.log("PASS material edit and cancellation use grams from database");
assert.ok((await client.rpc("archive_product",{p_id:product.product.id})).error);
const current=await ok(admin.from("transactions").select("revision").eq("id",inbound).single());
await ok(cancel(inbound,current.revision));
await ok(client.rpc("archive_product",{p_id:product.product.id}));
assert.equal((await ok(admin.from("product_option_inventory_view").select("*").eq("product_id",product.product.id))).length,0);
assert.equal((await ok(admin.from("products").select("*").eq("id",product.product.id))).length,1);
assert.ok((await makeTx("in",1)).error);
console.log("PASS zero-stock archive preserves references and blocks reuse");
const anonymous=createClient(config.API_URL,config.ANON_KEY);
assert.ok((await anonymous.rpc("archive_product",{p_id:material.product.id})).error);
assert.ok((await anonymous.rpc("manage_transaction",{p_id:materialOut,p_revision:2,p_changes:{},p_delete:true})).error);
assert.ok((await anonymous.from("management_audit").select("*")).error);
console.log("PASS anonymous RPC and audit access denied");
const archivedMaterial=await ok(client.rpc("register_product",{p_form:form("이력 보존 원재료","material",0)}));
const archivedIn=(await ok(makeTx("in",200,archivedMaterial.option.id))).transaction_id;
await ok(makeTx("out",200,archivedMaterial.option.id));
await ok(client.rpc("archive_product",{p_id:archivedMaterial.product.id}));
await ok(update(archivedIn,0,changes(200,warehouse,archivedMaterial.option.id)));
const historical=await ok(client.from("transaction_history_view").select("product_type").eq("transaction_id",archivedIn));
assert.equal(historical[0].product_type,"material");
assert.ok((await client.rpc("manage_transaction",{p_id:archivedIn,p_revision:1,p_changes:{},p_delete:null})).error);
console.log("PASS archived product history retains units and allows metadata edits; null actions rejected");
const http=async(path,method,body,authenticated=true)=>{
 const response=await fetch("http://127.0.0.1:3000"+path,{method,headers:{"Content-Type":"application/json",...(authenticated?{cookie:[...cookies].map(([n,v])=>n+"="+v).join("; ")}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:response.status,data:await response.json()};
};
assert.equal((await http("/api/products/manage","DELETE",{product_id:material.product.id},false)).status,401);
const httpProduct=await http("/api/products/manage","POST",form("화면 확인용 제품"));
assert.equal(httpProduct.status,200,JSON.stringify(httpProduct.data));
const fixtureTx=(await ok(makeTx("in",20,httpProduct.data.option.id))).transaction_id;
const detail=await http("/api/transactions/"+fixtureTx,"GET");
assert.equal(detail.status,200);
assert.equal((await http("/api/transactions/"+fixtureTx,"PATCH",{revision:0,...changes(18,warehouse,httpProduct.data.option.id)})).status,200);
assert.equal((await http("/api/transactions/"+fixtureTx,"PATCH",{revision:0,...changes(18,warehouse,httpProduct.data.option.id)})).status,409);
const disposable=(await ok(makeTx("in",3,httpProduct.data.option.id))).transaction_id;
assert.equal((await http("/api/transactions/"+disposable,"DELETE",{revision:0})).status,200);
assert.equal((await http("/api/transactions/"+disposable,"DELETE",{revision:0})).status,200);
assert.equal((await http("/api/transactions/"+disposable,"GET")).status,404);
const zeroProduct=await http("/api/products/manage","POST",form("삭제 확인용 제품"));
assert.equal((await http("/api/products/manage","DELETE",{product_id:zeroProduct.data.product.id})).status,200);
console.log("PASS development HTTP registration, session cookies, edit, conflict and deletion");
console.log(JSON.stringify({user:email,transactionId:fixtureTx,productOptionId:httpProduct.data.option.id,warehouse,warehouse2}));
