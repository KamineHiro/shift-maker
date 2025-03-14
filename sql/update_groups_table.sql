-- groupsテーブルに日付範囲の列を追加するSQL
ALTER TABLE groups ADD COLUMN shift_start_date DATE;
ALTER TABLE groups ADD COLUMN shift_days INTEGER DEFAULT 14; 