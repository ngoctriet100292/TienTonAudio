-- Normalize the three existing plan names and supported benefits.
-- Preserve prices, duration, plan IDs, payments and active subscriptions.
BEGIN;
UPDATE subscription_plans p
SET name = v.name, description = v.description
FROM (VALUES
(1, 'Kết Đan (30 ngày)', 'Truy cập chương VIP trong 30 ngày; Tu vi nghe x2 khi VIP còn hiệu lực; Tặng 1.500 EXP sau khi thanh toán được xác nhận.'),
(2, 'Nguyên Anh (90 ngày)', 'Truy cập chương VIP trong 90 ngày; Tu vi nghe x2 khi VIP còn hiệu lực; Tặng 4.500 EXP sau khi thanh toán được xác nhận.'),
(3, 'Tiên Vương (365 ngày)', 'Truy cập chương VIP trong 365 ngày; Tu vi nghe x2 khi VIP còn hiệu lực; Tặng 18.250 EXP sau khi thanh toán được xác nhận.')
) AS v(id, name, description)
WHERE p.id = v.id;
COMMIT;
