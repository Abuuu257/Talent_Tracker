-- CREATE DATABASE IF NOT EXISTS talent_tracker;
-- USE talent_tracker;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,
    role ENUM('athlete', 'coach', 'federation') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS athletes (
    user_id INT PRIMARY KEY,
    full_name VARCHAR(255),
    dob DATE,
    gender VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(255),
    street VARCHAR(255),
    city VARCHAR(100),
    category VARCHAR(50),
    coach_name VARCHAR(255),
    training_days VARCHAR(50),
    height FLOAT,
    weight FLOAT,
    blood_type VARCHAR(10),
    allergies TEXT,
    medical_conditions TEXT,
    meal_plan TEXT,
    school VARCHAR(255),
    club VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pending',
    profile_pic_url TEXT,
    id_doc_url TEXT,
    consent_doc_url TEXT,
    club_id_doc_url TEXT,
    admin_notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS athlete_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    athlete_id INT,
    event_name VARCHAR(100),
    personal_best FLOAT,
    experience VARCHAR(100),
    best_competition VARCHAR(100),
    FOREIGN KEY (athlete_id) REFERENCES athletes(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS athlete_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    athlete_id INT,
    event VARCHAR(100),
    meet VARCHAR(255),
    place VARCHAR(100),
    age_category VARCHAR(50),
    proof_url TEXT,
    date DATE,
    verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(255),
    verifier_id VARCHAR(100),
    verifier_notes TEXT,
    verified_at DATETIME,
    FOREIGN KEY (athlete_id) REFERENCES athletes(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS athlete_performance_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    athlete_id INT,
    event_name VARCHAR(100),
    date DATE,
    time FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athletes(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coaches (
    user_id INT PRIMARY KEY,
    full_name VARCHAR(255),
    gender VARCHAR(50),
    dob DATE,
    nationality VARCHAR(100),
    nic VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(255),
    street VARCHAR(255),
    city VARCHAR(100),
    district VARCHAR(100),
    province VARCHAR(100),
    sports VARCHAR(255),
    coaching_level VARCHAR(100),
    coaching_role VARCHAR(100),
    experience_years INT,
    organization VARCHAR(255),
    highest_qualification VARCHAR(255),
    issuing_authority VARCHAR(255),
    certificate_id VARCHAR(100),
    certificate_url TEXT,
    available_days VARCHAR(255),
    time_slots VARCHAR(255),
    location_preference VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pending',
    profile_pic_url TEXT,
    admin_notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS squads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coach_id INT,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coach_id) REFERENCES coaches(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS squad_athletes (
    squad_id INT,
    athlete_id INT,
    PRIMARY KEY(squad_id, athlete_id),
    FOREIGN KEY (squad_id) REFERENCES squads(id) ON DELETE CASCADE,
    FOREIGN KEY (athlete_id) REFERENCES athletes(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME,
    venue VARCHAR(255),
    city VARCHAR(100),
    category VARCHAR(100),
    eligibility TEXT,
    rules TEXT,
    requirements TEXT,
    registration_deadline DATE,
    max_participants INT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    image_url TEXT,
    status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS event_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT,
    athlete_id INT,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('registered', 'cancelled') DEFAULT 'registered',
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (athlete_id) REFERENCES athletes(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_registration (event_id, athlete_id)
);

-- Coach Favorites (Watchlist)
CREATE TABLE IF NOT EXISTS coach_favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coach_id INT NOT NULL,
    athlete_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coach_id) REFERENCES coaches(user_id) ON DELETE CASCADE,
    FOREIGN KEY (athlete_id) REFERENCES athletes(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (coach_id, athlete_id)
);

-- Coach Notes (Private notes about athletes)
CREATE TABLE IF NOT EXISTS coach_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coach_id INT NOT NULL,
    athlete_id INT NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (coach_id) REFERENCES coaches(user_id) ON DELETE CASCADE,
    FOREIGN KEY (athlete_id) REFERENCES athletes(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_note (coach_id, athlete_id)
);

-- Safe migration to add admin_notes to athletes if missing (for existing databases)
SET @dbname = DATABASE();
SET @tablename = 'athletes';
SET @columnname = 'admin_notes';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TEXT')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Safe migration to add admin_notes to coaches if missing (for existing databases)
SET @tablename = 'coaches';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TEXT')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Safe migration to add workout_plan to squads if missing
SET @tablename = 'squads';
SET @columnname = 'workout_plan';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TEXT')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Safe migration to add phone to users if missing
SET @tablename = 'users';
SET @columnname = 'phone';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(50) UNIQUE')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
