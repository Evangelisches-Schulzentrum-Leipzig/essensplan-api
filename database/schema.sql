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

-- Supplements master list (Zusatzstoffe)
CREATE TABLE IF NOT EXISTS supplements (
    id CHAR(2) PRIMARY KEY,
    name VARCHAR(60) NOT NULL
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=4;

-- Meals/dishes
CREATE TABLE IF NOT EXISTS meals (
    id MEDIUMINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(160) NOT NULL UNIQUE,
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
    supplement_id CHAR(2),
    PRIMARY KEY (meal_id, supplement_id),
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    FOREIGN KEY (supplement_id) REFERENCES supplements(id) ON DELETE CASCADE
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

-- Plan metadata
CREATE TABLE IF NOT EXISTS plan_metadata (
    date DATE PRIMARY KEY,
    holiday BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=4;

-- API metadata
CREATE TABLE IF NOT EXISTS api_metadata (
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    hash VARCHAR(64) NOT NULL,
    PRIMARY KEY (start_date, end_date),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=4;

-- Sample categories
INSERT IGNORE INTO categories (id, name) VALUES
(1, 'Menü 1'),
(2, 'Menü 2'),
(3, 'veg. Menü 3'),
(4, 'Salatteller'),
(5, 'Milch'),
(6, 'Glutenfrei'),
(7, 'N/A');

-- Sample allergens (German standard, matching source API)
INSERT IGNORE INTO allergens (id, name) VALUES
('A', 'Glutenhaltige Getreide'),
('B', 'Krebstiere'),
('C', 'Eier- und Eiererzeugnisse'),
('D', 'Fisch- und Fischerzeugnisse'),
('E', 'Erdnüsse und Erdnusserzeugnisse'),
('F', 'Soja und Sojaerzeugnisse'),
('G', 'Milch und Milcherzeugnisse'),
('H', 'Schalenfrüchte'),
('I', 'Sellerie und Sellerieerzeugnisse'),
('J', 'Senf und Senferzeugnisse'),
('K', 'Sesamsamen'),
('L', 'Schwefeldioxid und Sulfite'),
('M', 'Lupinen'),
('N', 'Weichtiere');

-- Sample supplements (Zusatzstoffe, matching source API)
INSERT IGNORE INTO supplements (id, name) VALUES
('1', 'mit Konservierungsstoff'),
('2', 'mit Farbstoff'),
('3', 'mit Antioxydationsmittel'),
('4', 'mit Süßungsmittel Saccarin'),
('5', 'mit Süßungsmittel Cyclamat'),
('6', 'mit Süßungsmittel Aspartam'),
('7', 'mit Süßungsmittel Acesulfam'),
('8', 'mit Phosphat'),
('9', 'geschwefelt'),
('10', 'chininhaltig'),
('11', 'coffeinhaltig'),
('12', 'mit Geschmacksverstärker'),
('13', 'geschwärzt'),
('14', 'gewachst'),
('15', 'mit Schweinefleisch');
