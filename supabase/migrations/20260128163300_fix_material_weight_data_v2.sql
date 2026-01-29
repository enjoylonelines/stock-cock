-- 원재료 weight_in_grams 데이터 수정 v2
-- 정확한 제품 이름으로 매칭, 엑셀 실재고수량(kg) × 1000 = g

-- 우리밀(밀다원) - 880kg = 880000g
UPDATE public.inventory i
SET weight_in_grams = 880000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '우리밀(밀다원)';

-- 고급제면용골드 - 400kg = 400000g
UPDATE public.inventory i
SET weight_in_grams = 400000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '고급제면용골드';

-- 강력 - 100kg = 100000g
UPDATE public.inventory i
SET weight_in_grams = 100000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '강력';

-- 변성전분 - 20kg = 20000g
UPDATE public.inventory i
SET weight_in_grams = 20000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '변성전분';

-- 멜로소이 - 40kg = 40000g
UPDATE public.inventory i
SET weight_in_grams = 40000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '멜로소이';

-- 베이킹파우더 - 32.7kg = 32700g
UPDATE public.inventory i
SET weight_in_grams = 32700
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '베이킹파우더';

-- 마아가린 - 43.2kg = 43200g
UPDATE public.inventory i
SET weight_in_grams = 43200
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '마아가린';

-- 제빵계량제(S-2000) - 21kg = 21000g
UPDATE public.inventory i
SET weight_in_grams = 21000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '제빵계량제(S-2000)';

-- 감미유-S - 18kg = 18000g
UPDATE public.inventory i
SET weight_in_grams = 18000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '감미유-S';

-- 식용유 - 36kg = 36000g
UPDATE public.inventory i
SET weight_in_grams = 36000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '식용유';

-- 볶음메밀가루 - 20kg = 20000g
UPDATE public.inventory i
SET weight_in_grams = 20000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '볶음메밀가루';

-- 한주소금 - 125kg = 125000g
UPDATE public.inventory i
SET weight_in_grams = 125000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '한주소금';

-- 고구마찰당면 - 112kg = 112000g
UPDATE public.inventory i
SET weight_in_grams = 112000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '고구마찰당면';

-- 무말랭이 - 150kg = 150000g
UPDATE public.inventory i
SET weight_in_grams = 150000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '무말랭이';

-- 백설탕 - 555kg = 555000g
UPDATE public.inventory i
SET weight_in_grams = 555000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '백설탕';

-- 후추 - 2kg = 2000g
UPDATE public.inventory i
SET weight_in_grams = 2000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '후추';

-- 가공소금 - 165kg = 165000g
UPDATE public.inventory i
SET weight_in_grams = 165000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '가공소금';

-- 다시다(실속다시다) - 40kg = 40000g
UPDATE public.inventory i
SET weight_in_grams = 40000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '다시다(실속다시다)';

-- 미원 - 70kg = 70000g
UPDATE public.inventory i
SET weight_in_grams = 70000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '미원';

-- 쌀가루 - 400kg = 400000g
UPDATE public.inventory i
SET weight_in_grams = 400000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '쌀가루';

-- 소고기분말 - 52.5kg = 52500g
UPDATE public.inventory i
SET weight_in_grams = 52500
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '소고기분말';

-- 아로맥스 - 10kg = 10000g
UPDATE public.inventory i
SET weight_in_grams = 10000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '아로맥스';

-- 만두시즈닝 - 20kg = 20000g
UPDATE public.inventory i
SET weight_in_grams = 20000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '만두시즈닝';

-- 간장(몽고진간장) - 221L = 221000ml (액체는 ml로 저장)
UPDATE public.inventory i
SET weight_in_grams = 221000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '간장(몽고진간장)';

-- 화미고추맛기름 - 1.8L = 1800ml
UPDATE public.inventory i
SET weight_in_grams = 1800
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '화미고추맛기름';

-- 고추가루 - 17.5kg = 17500g
UPDATE public.inventory i
SET weight_in_grams = 17500
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '고추가루';

-- 갈비소스(불고기맛소스) - 35kg = 35000g
UPDATE public.inventory i
SET weight_in_grams = 35000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '갈비소스(불고기맛소스)';

-- 물엿(화미고백당) - 14.14kg = 14140g
UPDATE public.inventory i
SET weight_in_grams = 14140
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '물엿(화미고백당)';

-- 화미카라멜 - 54kg = 54000g
UPDATE public.inventory i
SET weight_in_grams = 54000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '화미카라멜';

-- 단팥앙금(54ML) - 15kg = 15000g
UPDATE public.inventory i
SET weight_in_grams = 15000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '단팥앙금(54ML)';

-- 단팥앙금(팥과당) - 5kg = 5000g
UPDATE public.inventory i
SET weight_in_grams = 5000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '단팥앙금(팥과당)';

-- 고구마앙금 - 90kg = 90000g
UPDATE public.inventory i
SET weight_in_grams = 90000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '고구마앙금';

-- 한우가루 - 10kg = 10000g
UPDATE public.inventory i
SET weight_in_grams = 10000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '한우가루';

-- 단호박분말 - 3kg = 3000g
UPDATE public.inventory i
SET weight_in_grams = 3000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '단호박분말';

-- 건무(국산) - 10kg = 10000g
UPDATE public.inventory i
SET weight_in_grams = 10000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '건무(국산)';

-- 옥수수페이스트 - 20kg = 20000g
UPDATE public.inventory i
SET weight_in_grams = 20000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND (p.name = '옥수수페이스트' OR p.name LIKE '%옥수수페이스트%');

-- 유기농설탕 - 50kg = 50000g
UPDATE public.inventory i
SET weight_in_grams = 50000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '유기농설탕';

-- 참기름 - 5.4kg = 5400g
UPDATE public.inventory i
SET weight_in_grams = 5400
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '참기름';

-- 옥수수전분 - 20kg = 20000g
UPDATE public.inventory i
SET weight_in_grams = 20000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND (p.name = '옥수수전분' OR p.name LIKE '%옥수수전분%');

-- 고춧가루 - 1kg = 1000g (엑셀에서 "고춧가루"와 "고추가루" 구분)
UPDATE public.inventory i
SET weight_in_grams = 1000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id AND p.name = '고춧가루';
