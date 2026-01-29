-- 원재료 weight_in_grams 데이터 수정
-- 엑셀 데이터 기준: 실재고수량은 kg 단위이므로 1000을 곱해서 g으로 저장

-- 우리밀(밀다원) - 880kg
UPDATE public.inventory i
SET weight_in_grams = 880000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%우리밀%밀다원%';

-- 고급제면용골드 - 400kg
UPDATE public.inventory i
SET weight_in_grams = 400000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%고급제면용골드%';

-- 전용5호 - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%전용5호%';

-- 강력 - 100kg
UPDATE public.inventory i
SET weight_in_grams = 100000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%강력%';

-- 화권믹스 - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%화권믹스%';

-- 변성전분 - 20kg
UPDATE public.inventory i
SET weight_in_grams = 20000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%변성전분%';

-- 멜로소이 - 40kg
UPDATE public.inventory i
SET weight_in_grams = 40000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%멜로소이%';

-- 베이킹파우더 - 32.7kg
UPDATE public.inventory i
SET weight_in_grams = 32700
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%베이킹파우더%';

-- 마아가린 - 43.2kg
UPDATE public.inventory i
SET weight_in_grams = 43200
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%마아가린%' OR p.name LIKE '%마가린%';

-- 제빵계량제(S-2000) - 21kg
UPDATE public.inventory i
SET weight_in_grams = 21000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%제빵계량제%' OR p.name LIKE '%S-2000%';

-- 감미유-S - 18kg
UPDATE public.inventory i
SET weight_in_grams = 18000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%감미유%';

-- 식용유 - 36kg
UPDATE public.inventory i
SET weight_in_grams = 36000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%식용유%';

-- 볶음메밀가루 - 20kg
UPDATE public.inventory i
SET weight_in_grams = 20000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%볶음메밀%' OR p.name LIKE '%메밀가루%';

-- 한주소금 - 125kg
UPDATE public.inventory i
SET weight_in_grams = 125000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%한주소금%';

-- 버터 - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name = '버터';

-- 고구마찰당면 - 112kg
UPDATE public.inventory i
SET weight_in_grams = 112000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%고구마찰당면%' OR p.name LIKE '%당면%';

-- 무말랭이 - 150kg
UPDATE public.inventory i
SET weight_in_grams = 150000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%무말랭이%';

-- 백설탕 - 555kg
UPDATE public.inventory i
SET weight_in_grams = 555000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%백설탕%';

-- 후추 - 2kg
UPDATE public.inventory i
SET weight_in_grams = 2000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%후추%';

-- 가공소금 - 165kg
UPDATE public.inventory i
SET weight_in_grams = 165000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%가공소금%';

-- 다시다(실속다시다) - 40kg
UPDATE public.inventory i
SET weight_in_grams = 40000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%다시다%';

-- 미원 - 70kg
UPDATE public.inventory i
SET weight_in_grams = 70000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%미원%';

-- 쌀가루 - 400kg
UPDATE public.inventory i
SET weight_in_grams = 400000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%쌀가루%';

-- 참기름(참참참농가참기름) - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%참참참%' OR p.name LIKE '%농가참기름%';

-- 소고기분말 - 52.5kg
UPDATE public.inventory i
SET weight_in_grams = 52500
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%소고기분말%';

-- 아로맥스 - 10kg
UPDATE public.inventory i
SET weight_in_grams = 10000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%아로맥스%';

-- 만두시즈닝 - 20kg
UPDATE public.inventory i
SET weight_in_grams = 20000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%만두시즈닝%';

-- 간장(몽고진간장) - 221kg (리터로 가정하면 221L = 221000ml)
UPDATE public.inventory i
SET weight_in_grams = 221000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%몽고진간장%' OR p.name LIKE '%몽고%간장%';

-- 화미고추맛기름 - 1.8kg
UPDATE public.inventory i
SET weight_in_grams = 1800
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%화미고추맛기름%' OR p.name LIKE '%고추맛기름%';

-- 고추가루 - 17.5kg
UPDATE public.inventory i
SET weight_in_grams = 17500
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%고추가루%' AND p.name NOT LIKE '%고춧가루%';

-- 갈비소스(불고기맛소스) - 35kg
UPDATE public.inventory i
SET weight_in_grams = 35000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%갈비소스%' OR p.name LIKE '%불고기맛소스%';

-- 물엿(화미고백당) - 14.14kg
UPDATE public.inventory i
SET weight_in_grams = 14140
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%물엿%' OR p.name LIKE '%화미고백당%';

-- 화미카라멜 - 54kg
UPDATE public.inventory i
SET weight_in_grams = 54000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%화미카라멜%' OR p.name LIKE '%카라멜%';

-- 단팥앙금(54ML) - 15kg
UPDATE public.inventory i
SET weight_in_grams = 15000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%단팥앙금%54%' OR p.name LIKE '%54ML%';

-- 단팥앙금(팥과당) - 5kg
UPDATE public.inventory i
SET weight_in_grams = 5000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%단팥앙금%팥과당%' OR p.name LIKE '%팥과당%';

-- 고구마앙금 - 90kg
UPDATE public.inventory i
SET weight_in_grams = 90000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%고구마앙금%';

-- 완두앙금 - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%완두앙금%';

-- 한우가루 - 10kg
UPDATE public.inventory i
SET weight_in_grams = 10000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%한우가루%';

-- 단호박분말 - 3kg
UPDATE public.inventory i
SET weight_in_grams = 3000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%단호박분말%';

-- 건무(국산) - 10kg
UPDATE public.inventory i
SET weight_in_grams = 10000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%건무%';

-- 옥수수페이스트 - 20kg
UPDATE public.inventory i
SET weight_in_grams = 20000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%옥수수페이스트%';

-- 찰옥수수(냉동) - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%찰옥수수%냉동%';

-- 유기농설탕 - 50kg
UPDATE public.inventory i
SET weight_in_grams = 50000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%유기농설탕%';

-- 참기름 - 5.4kg
UPDATE public.inventory i
SET weight_in_grams = 5400
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name = '참기름';

-- 유기농단팥앙금 - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%유기농단팥앙금%' OR p.name LIKE '%유기농%단팥앙금%';

-- 건조 스위트콘 - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%스위트콘%';

-- 청양고추 - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name = '청양고추';

-- 이든백년초 - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%이든백년초%' OR p.name LIKE '%백년초%';

-- 청양고추분말 - 2.3kg
UPDATE public.inventory i
SET weight_in_grams = 2300
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%청양고추분말%';

-- 볶은콩가루 - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%볶은콩가루%';

-- 타피오카전분 - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%타피오카전분%';

-- 감자떡가루 - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%감자떡가루%';

-- 김치맛시즈닝 - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%김치맛시즈닝%';

-- 통팥고물 - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%통팥고물%';

-- 단팥앙금 (일반) - 10kg
UPDATE public.inventory i
SET weight_in_grams = 10000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name = '단팥앙금';

-- 바나나앙금 - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%바나나앙금%';

-- 바나나레진N - 0.6kg
UPDATE public.inventory i
SET weight_in_grams = 600
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%바나나레진%';

-- 딸기앙금 - 0kg
UPDATE public.inventory i
SET weight_in_grams = 0
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%딸기앙금%';

-- 딸기레진N - 0.3kg
UPDATE public.inventory i
SET weight_in_grams = 300
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%딸기레진%';

-- 옥수수전분 - 20kg
UPDATE public.inventory i
SET weight_in_grams = 20000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%옥수수전분%';

-- 고춧가루 - 1kg
UPDATE public.inventory i
SET weight_in_grams = 1000
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.name LIKE '%고춧가루%';
