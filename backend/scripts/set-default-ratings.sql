-- Tüm eğitmenlerin puanını 5.00 yap (varsayılan başlangıç puanı)
UPDATE trainer SET avg_rating = '5.00' WHERE avg_rating = '0.00';

-- Tüm tenant'ların (partner kulüpler) puanını 5.00 yap
UPDATE tenant SET avg_rating = '5.00' WHERE avg_rating = '0.00';
