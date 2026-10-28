-- 2GIS export put the building type into the category for a few venues
-- ("Частный дом", "Ремонтируемое здание", ...). They are real cafés, so they get
-- a food category instead of being dropped.
UPDATE establishments
SET cuisine = 'Кафе'
WHERE cuisine IN (
    'Административное здание',
    'Частный дом',
    'Ремонтируемое здание',
    'Объект',
    'Магазин',
    'Развлекательное заведение',
    'Культурно-развлекательный комплекс'
);
