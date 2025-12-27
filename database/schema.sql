-- MariaDB 12+
CREATE DATABASE IF NOT EXISTS cafeteria_menu 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE cafeteria_menu;

-- Meal categories/menues
CREATE TABLE IF NOT EXISTS categories (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(40) NOT NULL UNIQUE KEY
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=4;

-- Allergens master list
CREATE TABLE IF NOT EXISTS allergens (
    id CHAR(1) PRIMARY KEY,
    name VARCHAR(80) NOT NULL
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=4;

-- Supplements master list
CREATE TABLE IF NOT EXISTS supplements (
    id CHAR(1) PRIMARY KEY,
    name VARCHAR(60) NOT NULL
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=4;

-- Meals/dishes
CREATE TABLE IF NOT EXISTS meals (
    id MEDIUMINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    dietary_flags TINYINT UNSIGNED DEFAULT 0 COMMENT 'Bit 0: vegetarian, Bit 1: vegan, Bit 2: gluten-free',
    created_date DATE DEFAULT (CURDATE()),
    KEY idx_dietary (dietary_flags),
    FULLTEXT KEY idx_name (name)
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;

-- Meal allergens (junction table)
CREATE TABLE IF NOT EXISTS meal_allergens (
    meal_id MEDIUMINT UNSIGNED,
    allergen_id CHAR(1),
    PRIMARY KEY (meal_id, allergen_id),
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    FOREIGN KEY (allergen_id) REFERENCES allergens(id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=4;

-- Meal supplements (junction table)
CREATE TABLE IF NOT EXISTS meal_supplements (
    meal_id MEDIUMINT UNSIGNED,
    supplement_id CHAR(1),
    PRIMARY KEY (meal_id, supplement_id),
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    FOREIGN KEY (supplement_id) REFERENCES supplements(id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=4;

-- Closed dates for the canteen
CREATE TABLE IF NOT EXISTS closed_dates (
    date DATE PRIMARY KEY,
    reason VARCHAR(150)
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=4;

-- Meals scheduled for specific dates with pricing
CREATE TABLE IF NOT EXISTS plan_meals (
    date DATE NOT NULL,
    category_id TINYINT UNSIGNED,
    meal_id MEDIUMINT UNSIGNED NOT NULL,
    price DECIMAL(4,2),
    display_order TINYINT UNSIGNED DEFAULT 0,
    PRIMARY KEY (date, meal_id),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    KEY idx_category (category_id)
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;

-- Sample categories
INSERT IGNORE INTO categories (name) VALUES
('Menü 1'),
('Menü 2'),
('Menü 3 (veg)'),
('Salatteller');

-- Sample allergens (German standard)
INSERT IGNORE INTO allergens (id, name) VALUES
('A', 'Glutenhaltiges Getreide'),
('B', 'Krebstiere'),
('C', 'Eier'),
('D', 'Fisch'),
('E', 'Erdnüsse'),
('F', 'Soja'),
('G', 'Milch/Laktose'),
('H', 'Schalenfrüchte'),
('L', 'Sellerie'),
('M', 'Senf'),
('N', 'Sesamsamen'),
('O', 'Schwefeldioxid/Sulfite'),
('P', 'Lupinen'),
('R', 'Weichtiere');

-- Sample supplements
INSERT IGNORE INTO supplements (id, name) VALUES
('1', 'mit Farbstoff'),
('2', 'mit Konservierungsstoff'),
('3', 'mit Antioxidationsmittel'),
('4', 'mit Geschmacksverstärker'),
('5', 'geschwefelt'),
('6', 'geschwärzt'),
('7', 'gewachst'),
('8', 'mit Phosphat'),
('9', 'mit Süßungsmittel');
