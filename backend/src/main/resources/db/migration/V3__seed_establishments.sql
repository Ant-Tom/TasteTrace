INSERT INTO establishments (id, name, cuisine, city, latitude, longitude)
VALUES
    (1, 'Ромэйн', 'Italian', 'Казань', 55.7938, 49.1221),
    (2, 'Yokoso', 'Japanese', 'Казань', 55.7901, 49.1130),
    (3, 'Грузинские Истории', 'Georgian', 'Казань', 55.7964, 49.1089),
    (4, 'Burger Club', 'Burgers', 'Казань', 55.7887, 49.1204);

SELECT setval('establishments_id_seq', (SELECT MAX(id) FROM establishments));
