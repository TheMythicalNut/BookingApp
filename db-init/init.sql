CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS public;

-- =========================================================
-- ENUM: SUBSCRIPTION STATUS
-- =========================================================

DO $$
BEGIN
    CREATE TYPE subscription_status AS ENUM (
        'TRIALING',
        'ACTIVE',
        'PAST_DUE',
        'PAUSED',
        'CANCELLED',
        'EXPIRED',
        'PARTNER' -- partners don't require payments
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END$$;


-- =========================================================
-- ENUM: RESERVATION STATUS
-- =========================================================

DO $$
BEGIN
    CREATE TYPE reservation_status AS ENUM (
        'PENDING_CONFIRMATION',
        'CONFIRMATION_EXPIRED',
        'CONFIRMED',
        'USER_CANCELLED',
        'USER_LATE_CANCELLED',
        'OWNER_LATE_CANCELLED',
        'OWNER_CANCELLED',
        'COMPLETED',
        'MISSED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END$$;

-- =========================================================
-- ENUM: OWNER STATUS
-- =========================================================

DO $$
BEGIN
    CREATE TYPE owner_status AS ENUM (
        'ACTIVE',
        'SUSPENDED',
        'INACTIVE'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END$$;

-- =========================================================
-- ENUM: SETUP STATE
-- =========================================================

DO $$
BEGIN
    CREATE TYPE setup_state AS ENUM (
        'INTRO',
        'PROFILE',
        'LOCATION',
        'MEDIA',
        'SCHEDULE',
        'EXCEPTIONS',
        'CATEGORIES',
        'SERVICES',
        'PACKAGES',
        'DISCOUNTS',
        'BOOKING_RULES',
        'PUBLISH',
        'COMPLETED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END$$;

-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email CITEXT NOT NULL,
    phone TEXT NOT NULL,
    banned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT users_email_phone_key UNIQUE (email, phone)
);

-- =========================================================
-- STUDIOS
-- =========================================================

CREATE TABLE IF NOT EXISTS studios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    score DOUBLE PRECISION NOT NULL DEFAULT 0.5 CHECK (score BETWEEN 0 AND 1),

    published BOOLEAN NOT NULL DEFAULT FALSE, -- Defines if the studio is accessable
    visible BOOLEAN NOT NULL DEFAULT TRUE, -- Defines if the studio is visible in studio list or if studio articles are visible in the studio list

    type TEXT NOT NULL DEFAULT '[]', -- JSON-encoded array of strings
    search_tags TEXT NOT NULL DEFAULT '[]' , -- JSON-encoded array of strings

    link TEXT NOT NULL UNIQUE,
    contact_email TEXT UNIQUE,
    contact_phone TEXT UNIQUE,
    instagram_link TEXT UNIQUE,
    facebook_link TEXT UNIQUE,
    whatsapp_phone TEXT UNIQUE,

    country TEXT NOT NULL,
    city TEXT NOT NULL,
    street TEXT NOT NULL,
    building_number TEXT NOT NULL,
    apartment_number TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),

    time_zone TEXT NOT NULL,

    thumbnail TEXT,

    email_reminders BOOLEAN NOT NULL DEFAULT FALSE, -- for MVP v2
    sms_reminders BOOLEAN NOT NULL DEFAULT FALSE, -- for MVP v2
    min_schedule_ahead INTEGER NOT NULL DEFAULT 1440, -- in minutes => 1 day
    max_schedule_ahead INTEGER NOT NULL DEFAULT 43200, -- in minutes => 30 days

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP NULL
);

-- =========================================================
-- OWNERS (1:1 or 1:N with studios)
-- =========================================================

CREATE TABLE IF NOT EXISTS owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL CHECK (length(password_hash) >= 60),
    
    setup_state setup_state NOT NULL DEFAULT 'INTRO',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    
    studio_id UUID NOT NULL UNIQUE,

    deleted_at TIMESTAMP NULL,

    CONSTRAINT fk_owner_studio
        FOREIGN KEY (studio_id)
        REFERENCES studios(id)
);

-- =========================================================
-- SESSIONS (Owner authentication sessions)
-- =========================================================

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    owner_id UUID NOT NULL,
    token TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_session_owner
        FOREIGN KEY (owner_id)
        REFERENCES owners(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    token TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- =========================================================
-- STUDIO CATEGORIES
-- =========================================================

CREATE TABLE IF NOT EXISTS studio_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studio_id UUID NOT NULL,
    name TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_category_studio
        FOREIGN KEY (studio_id)
        REFERENCES studios(id)
        ON DELETE CASCADE
);

-- =========================================================
-- STUDIO SERVICES (Canonical Entity)
-- =========================================================

CREATE TABLE IF NOT EXISTS studio_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studio_id UUID NOT NULL,

    type TEXT NOT NULL, -- JSON-encoded array of strings

    name TEXT NOT NULL,
    link TEXT NOT NULL,
    price DOUBLE PRECISION NOT NULL CHECK (price >= 0),
    currency TEXT NOT NULL,
    discount INT NOT NULL DEFAULT 0 CHECK (discount BETWEEN 0 AND 100),
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    description TEXT,
    thumbnail TEXT,
    is_reservable BOOLEAN NOT NULL DEFAULT TRUE,

    prerequirement_id UUID,

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP NULL,

    CONSTRAINT fk_service_studio
        FOREIGN KEY (studio_id)
        REFERENCES studios(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_service_prerequirement
        FOREIGN KEY (prerequirement_id)
        REFERENCES studio_services(id)
        ON DELETE SET NULL
);

-- =========================================================
-- STUDIO PACKAGES (Canonical Entity)
-- =========================================================

CREATE TABLE IF NOT EXISTS studio_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studio_id UUID NOT NULL,

    name TEXT NOT NULL,
    link TEXT NOT NULL,
    price DOUBLE PRECISION NOT NULL CHECK (price >= 0),
    currency TEXT NOT NULL,
    discount INT NOT NULL DEFAULT 0 CHECK (discount BETWEEN 0 AND 100),
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    description TEXT,
    is_reservable BOOLEAN NOT NULL DEFAULT TRUE,

    prerequirement_id UUID,

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP NULL,

    CONSTRAINT fk_package_studio
        FOREIGN KEY (studio_id)
        REFERENCES studios(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_package_prerequirement
        FOREIGN KEY (prerequirement_id)
        REFERENCES studio_packages(id)
        ON DELETE SET NULL
);

-- =========================================================
-- CATEGORY ↔ SERVICES (JUNCTION TABLE)
-- =========================================================

CREATE TABLE IF NOT EXISTS category_services (
    category_id UUID NOT NULL,
    service_id UUID NOT NULL,

    PRIMARY KEY (category_id, service_id),

    CONSTRAINT fk_cs_category
        FOREIGN KEY (category_id)
        REFERENCES studio_categories(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cs_service
        FOREIGN KEY (service_id)
        REFERENCES studio_services(id)
        ON DELETE CASCADE
);

-- =========================================================
-- SERVICE ↔ PACKAGE (JUNCTION TABLE)
-- =========================================================

CREATE TABLE IF NOT EXISTS service_packages (
    service_id UUID NOT NULL,
    package_id UUID NOT NULL,

    PRIMARY KEY (service_id, package_id),

    CONSTRAINT fk_sp_service
        FOREIGN KEY (service_id)
        REFERENCES studio_services(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_sp_package
        FOREIGN KEY (package_id)
        REFERENCES studio_packages(id)
        ON DELETE CASCADE
);

-- =========================================================
-- SERVICE ADDONS
-- =========================================================

CREATE TABLE IF NOT EXISTS service_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL,
    name TEXT NOT NULL,
    price TEXT CHECK (price >= '0'),
    duration_delta_minutes INT CHECK (duration_delta_minutes >= 0),
    group_id TEXT,
    is_exclusive BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_addon_service
        FOREIGN KEY (service_id)
        REFERENCES studio_services(id)
        ON DELETE CASCADE
);


-- =========================================================
-- SERVICE IMAGES
-- =========================================================

CREATE TABLE IF NOT EXISTS service_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL,

    key TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_service_images_service
        FOREIGN KEY (service_id)
        REFERENCES studio_services(id)
        ON DELETE CASCADE
);


-- =========================================================
-- STUDIO IMAGES
-- =========================================================

CREATE TABLE IF NOT EXISTS studio_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studio_id UUID NOT NULL,

    key TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_studio_images_studio
        FOREIGN KEY (studio_id)
        REFERENCES studios(id)
        ON DELETE CASCADE
);

-- =========================================================
-- PACKAGE ADDONS
-- =========================================================

CREATE TABLE IF NOT EXISTS package_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL,
    name TEXT NOT NULL,
    price TEXT CHECK (price >= '0'),
    duration_delta_minutes INT CHECK (duration_delta_minutes >= 0),
    group_id TEXT,
    is_exclusive BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_addon_package
        FOREIGN KEY (package_id)
        REFERENCES studio_packages(id)
        ON DELETE CASCADE
);

-- =========================================================
-- WEEKLY SCHEDULES
-- =========================================================

CREATE TABLE IF NOT EXISTS weekly_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studio_id UUID NOT NULL,
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_weekly_studio
        FOREIGN KEY (studio_id)
        REFERENCES studios(id)
        ON DELETE CASCADE
);

-- =========================================================
-- DAY SCHEDULES
-- =========================================================

CREATE TABLE IF NOT EXISTS day_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    weekly_schedule_id UUID NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_day_weekly
        FOREIGN KEY (weekly_schedule_id)
        REFERENCES weekly_schedules(id)
        ON DELETE CASCADE
);

-- =========================================================
-- SCHEDULE EXCEPTIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studio_id UUID NOT NULL,
    label TEXT,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_exception_studio
        FOREIGN KEY (studio_id)
        REFERENCES studios(id)
        ON DELETE CASCADE
);

-- =========================================================
-- TIME INTERVALS
-- =========================================================

CREATE TABLE IF NOT EXISTS time_intervals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_schedule_id UUID,
    exception_id UUID,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CHECK (start_time < end_time),

    CONSTRAINT fk_interval_day
        FOREIGN KEY (day_schedule_id)
        REFERENCES day_schedules(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_interval_exception
        FOREIGN KEY (exception_id)
        REFERENCES schedule_exceptions(id)
        ON DELETE CASCADE
);

-- =========================================================
-- EXCEPTION DATE RULES
-- =========================================================

CREATE TABLE IF NOT EXISTS exception_date_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exception_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('oneOff', 'range', 'annual')),

    -- oneOff
    date          DATE,

    -- range
    start_date    DATE,
    end_date      DATE,

    -- annual
    month         SMALLINT CHECK (month BETWEEN 1 AND 12),
    day           SMALLINT CHECK (day BETWEEN 1 AND 31),

    created_at    TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_date_rule_exception
        FOREIGN KEY (exception_id)
        REFERENCES schedule_exceptions(id)
        ON DELETE CASCADE
);

-- =========================================================
-- RESERVATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL,
    studio_id UUID NOT NULL,

    service_id UUID,
    package_id UUID,

    -- Snapshot fields (immutable at booking time)
    price DOUBLE PRECISION NOT NULL CHECK (price >= 0),
    currency TEXT NOT NULL,
    discount INT NOT NULL CHECK (discount BETWEEN 0 AND 100),
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),

    contact_phone TEXT NOT NULL,
    additional_note TEXT,

    -- Location snapshot
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    time_zone TEXT NOT NULL,

    -- Reservation lifecycle
    status reservation_status NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    status_comment TEXT,

    term_change_count INT NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    confirmation_expires_at TIMESTAMP NOT NULL,

    -- Ensure exactly one of service or package is set
    CONSTRAINT chk_service_xor_package
        CHECK (
            (service_id IS NOT NULL AND package_id IS NULL)
            OR
            (service_id IS NULL AND package_id IS NOT NULL)
        ),

    CONSTRAINT fk_reservation_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reservation_studio
        FOREIGN KEY (studio_id)
        REFERENCES studios(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reservation_service
        FOREIGN KEY (service_id)
        REFERENCES studio_services(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_reservation_package
        FOREIGN KEY (package_id)
        REFERENCES studio_packages(id)
        ON DELETE SET NULL
);


-- =========================================================
-- RESERVATION TIMESLOTS
-- =========================================================

CREATE TABLE IF NOT EXISTS reservation_timeslots (
    reservation_id UUID PRIMARY KEY,
    reservation_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,

    CONSTRAINT chk_time_order
        CHECK (end_time IS NULL OR start_time < end_time),

    CONSTRAINT fk_timeslot_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES reservations(id)
        ON DELETE CASCADE
);

-- =========================================================
-- RESERVATION STATUS TRANSITIONS
-- =========================================================

CREATE TABLE reservation_status_transitions (
    from_status reservation_status NOT NULL,
    to_status   reservation_status NOT NULL,
    admin_only BOOLEAN DEFAULT FALSE,
    
    PRIMARY KEY (from_status, to_status)
);

-- =========================================================
-- RESERVATION ADDONS
-- =========================================================

CREATE TABLE IF NOT EXISTS reservation_addons (
    reservation_id UUID NOT NULL,
    addon_id UUID NOT NULL,

    PRIMARY KEY (reservation_id, addon_id),

    CONSTRAINT fk_ra_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES reservations(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ra_service_addon
        FOREIGN KEY (addon_id)
        REFERENCES service_addons(id)
        ON DELETE CASCADE
);

-- =========================================================
-- RESERVATION RATINGS
-- =========================================================

CREATE TABLE IF NOT EXISTS reservation_ratings (
    reservation_id UUID PRIMARY KEY,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_rating_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES reservations(id)
        ON DELETE CASCADE
);


-- =========================================================
-- PLANS
-- =========================================================

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name TEXT NOT NULL,
    description TEXT,
    price DOUBLE PRECISION NOT NULL CHECK (price >= 0),
    currency TEXT NOT NULL,
    billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly','yearly')),

    paddle_product_id TEXT NOT NULL,
    paddle_price_id TEXT NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- =========================================================
-- OWNER SUBSCRIPTIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS owner_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    owner_id UUID NOT NULL UNIQUE,
    plan_id UUID NOT NULL,

    paddle_customer_id TEXT NOT NULL,
    paddle_subscription_id TEXT NOT NULL UNIQUE,

    status subscription_status NOT NULL,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,

    trial_end TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_subscription_owner
        FOREIGN KEY (owner_id)
        REFERENCES owners(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_subscription_plan
        FOREIGN KEY (plan_id)
        REFERENCES plans(id)
        ON DELETE RESTRICT
);

-- =========================================================
-- PAYMENT EVENTS (WEBHOOK LOG)
-- =========================================================

CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    paddle_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,

    owner_subscription_id UUID,
    raw_payload JSONB NOT NULL,

    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_event_subscription
        FOREIGN KEY (owner_subscription_id)
        REFERENCES owner_subscriptions(id)
        ON DELETE SET NULL
);

-- =========================================================
-- SUBSCRIPTION INVOICES
-- =========================================================

CREATE TABLE IF NOT EXISTS subscription_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    owner_subscription_id UUID NOT NULL,

    paddle_invoice_id TEXT NOT NULL UNIQUE,

    amount DOUBLE PRECISION NOT NULL,
    currency TEXT NOT NULL,

    status TEXT NOT NULL,
    invoice_url TEXT,

    billed_at TIMESTAMP,
    paid_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_invoice_subscription
        FOREIGN KEY (owner_subscription_id)
        REFERENCES owner_subscriptions(id)
        ON DELETE CASCADE
);

-- =========================================================
-- INDEXES
-- =========================================================

-- USERS
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- STUDIOS
CREATE INDEX IF NOT EXISTS idx_studios_city ON studios(city);
CREATE INDEX IF NOT EXISTS idx_studios_city_country ON studios(city, country);
CREATE INDEX IF NOT EXISTS idx_studios_geo ON studios(latitude, longitude);

-- OWNERS
CREATE INDEX IF NOT EXISTS idx_owners_studio_id ON owners(studio_id);
CREATE INDEX IF NOT EXISTS idx_owners_status ON owners(status);
CREATE INDEX IF NOT EXISTS idx_owners_setup_state ON owners(setup_state);

-- SESSIONS
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_owner_id ON sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- SERVICES
CREATE INDEX IF NOT EXISTS idx_services_studio_id ON studio_services(studio_id);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON studio_services(created_at);
CREATE INDEX IF NOT EXISTS idx_services_prerequirement ON studio_services(prerequirement_id);
CREATE INDEX IF NOT EXISTS idx_services_id_studio ON studio_services(id, studio_id);
CREATE INDEX IF NOT EXISTS idx_service_images_service ON service_images(service_id);

-- PACKAGES
CREATE INDEX IF NOT EXISTS idx_packages_studio_id ON studio_packages(studio_id);
CREATE INDEX IF NOT EXISTS idx_packages_id_studio ON studio_packages(id, studio_id);

-- JUNCTION TABLES
CREATE INDEX IF NOT EXISTS idx_category_services_service ON category_services(service_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_package ON service_packages(package_id);

-- SCHEDULE
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_studio ON weekly_schedules(studio_id);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_studio ON schedule_exceptions(studio_id);

-- RESERVATIONS
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_studio_id ON reservations(studio_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservation_timeslots_date ON reservation_timeslots(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservation_expiration ON reservations (status, confirmation_expires_at);

-- SUBSCRIPTIONS
CREATE INDEX IF NOT EXISTS idx_owner_subscriptions_owner ON owner_subscriptions(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_subscriptions_status ON owner_subscriptions(status);

-- PAYMENT EVENTS
CREATE INDEX IF NOT EXISTS idx_payment_events_event ON payment_events(paddle_event_id);

-- =========================================================
-- CONST VALUES
-- =========================================================

INSERT INTO reservation_status_transitions (from_status, to_status) VALUES
-- PENDING_CONFIRMATION transitions
('PENDING_CONFIRMATION','CONFIRMATION_EXPIRED'),
('PENDING_CONFIRMATION','CONFIRMED'),
('PENDING_CONFIRMATION','USER_CANCELLED'),
('PENDING_CONFIRMATION','USER_LATE_CANCELLED'),
('PENDING_CONFIRMATION','OWNER_LATE_CANCELLED'),
('PENDING_CONFIRMATION','OWNER_CANCELLED'),

-- CONFIRMED transitions
('CONFIRMED','USER_CANCELLED'),
('CONFIRMED','USER_LATE_CANCELLED'),
('CONFIRMED','OWNER_CANCELLED'),
('CONFIRMED','OWNER_LATE_CANCELLED'),
('CONFIRMED','COMPLETED'),
('CONFIRMED','MISSED');

-- =========================================================
-- FUNCTIONS
-- =========================================================

CREATE OR REPLACE FUNCTION validate_reservation_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

  -- allow unchanged value
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- check transition table
  IF EXISTS (
      SELECT 1
      FROM reservation_status_transitions
      WHERE from_status = OLD.status
      AND to_status = NEW.status
  ) THEN
      RETURN NEW;
  END IF;

  RAISE EXCEPTION
      'Invalid reservation status transition: % → %',
      OLD.status, NEW.status;

END;
$$;

CREATE TRIGGER reservation_status_transition_guard
BEFORE UPDATE OF status ON reservations FOR EACH ROW
EXECUTE FUNCTION validate_reservation_status_transition();

-- =========================================================
-- TESTING VALUES
-- =========================================================
-- =========================================================
-- COMPREHENSIVE TESTING DATA
-- Nail Studio Management Platform
-- Generated for multi-tenant testing scenarios
-- Single owner per studio model
-- =========================================================

-- =========================================================
-- 1. USERS (10 users across 5 countries)
-- =========================================================

INSERT INTO users (id, email, phone, banned) VALUES
-- Serbia users
('10000000-0000-0000-0000-000000000001', 'john.doe@email.com', '+381601234567', false),
('10000000-0000-0000-0000-000000000002', 'maria.petrovic@gmail.com', '+381642345678', false),
('10000000-0000-0000-0000-000000000003', 'banned.user@outlook.com', '+381653456789', true), -- Banned user
-- Germany users
('10000000-0000-0000-0000-000000000004', 'hans.mueller@web.de', '+4915112345678', false),
('10000000-0000-0000-0000-000000000005', 'anna.schmidt@company.de', '+4915223456789', false),
-- USA users
('10000000-0000-0000-0000-000000000006', 'mike.johnson@yahoo.com', '+12125551234', false),
('10000000-0000-0000-0000-000000000007', 'sarah.williams@corp.com', '+13105552345', false),
-- UK users
('10000000-0000-0000-0000-000000000008', 'james.brown@co.uk', '+447700123456', false),
('10000000-0000-0000-0000-000000000009', 'emma.davis@business.uk', '+447711234567', false),
-- France users
('10000000-0000-0000-0000-000000000010', 'pierre.dubois@orange.fr', '+33612345678', false),
('10000000-0000-0000-0000-000000000011', 'sophie.martin@free.fr', '+33623456789', true); -- Banned user

-- =========================================================
-- 2. STUDIOS (4 nail studios in different global locations)
-- =========================================================

INSERT INTO studios (id, name, score, link, country, city, street, building_number, apartment_number, latitude, longitude, time_zone, thumbnail, type, search_tags, contact_email, contact_phone, published, visible) VALUES
-- Belgrade, Serbia (CET/CEST)
('20000000-0000-0000-0000-000000000001', 'Pr. Glamour Nails Belgrade', 0.25, 'glamour-nails-bg', 'Србија', 'Београд', 'Краља Петра I', '123', '4a', 44.7866, 20.4489, 'Europe/Belgrade', 'cat.jpg', '["0", "1"]', '["nails", "spa", "beauty"]', 'office@glamournails.rs', '+381649876543', TRUE, TRUE),
-- Berlin, Germany (CET/CEST)
('20000000-0000-0000-0000-000000000002', 'Pr. Chic Nail Studio Berlin', 0.5, 'chic-nails-berlin', 'Deutschland', 'Berlin', 'Müllerstraße', '456', '5a', 52.52, 13.4, 'Europe/Berlin', 'spletka-test.jpg', '["0", "2"]', '["nails", "art", "design"]', 'office@chicnails.de', '+499107797984', TRUE, TRUE),
-- London, UK (GMT/BST)
('20000000-0000-0000-0000-000000000003', 'Pr. Polish & Pamper London', 0.75, 'polish-pamper', 'United Kingdom', 'London', 'Baker Street', '789', '6b', 51.5074, -0.1278, 'Europe/London', 'spletka-test.jpg', '["1", "3"]', '["nails", "luxury", "relaxation"]', 'office@ppamper.uk', '+447828438778', TRUE, TRUE),
-- New York, USA (EST/EDT)
('20000000-0000-0000-0000-000000000004', 'Pr. Manhattan Nail Bar', 0.33, 'manhattan-nail-bar', 'USA', 'New York', 'Broadway', '1234', '7b', 40.7128, -74.006, 'America/New_York', 'spletka-test.jpg', '["1", "2"]', '["hair", "barber", "fast"]', 'office@manhattan-nails.co', '+19492883199', TRUE, TRUE);


INSERT INTO studio_images(id, studio_id, key, display_order) VALUES
('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'cat.jpg', 1),
('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'cat.jpg', 2),
('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'cat.jpg', 3),
('21000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'spletka-test-2.jpg', 1),
('21000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'spletka-test-2.jpg', 2),
('21000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', 'spletka-test-2.jpg', 3),
('21000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000003', 'spletka-test-2.jpg', 1),
('21000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000003', 'spletka-test-2.jpg', 2),
('21000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000003', 'spletka-test-2.jpg', 3),
('21000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000004', 'spletka-test-2.jpg', 1),
('21000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000004', 'spletka-test-2.jpg', 2),
('21000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000004', 'spletka-test-2.jpg', 3);


-- =========================================================
-- WEEKLY SCHEDULES
-- =========================================================

INSERT INTO weekly_schedules (id, studio_id, effective_from, effective_to) VALUES
('a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', NULL, NULL),
('a0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '2026-01-01', '2026-12-31'),
('a0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '2026-01-01', '2026-12-31'),
('a0000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '2026-01-01', '2026-12-31');

-- =========================================================
-- DAY SCHEDULES
-- =========================================================

-- Belgrade Studio
INSERT INTO day_schedules (id, weekly_schedule_id, day_of_week, is_closed) VALUES
('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, FALSE), -- MONDAY === 1
('a1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 2, FALSE),
('a1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 3, FALSE),
('a1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 4, FALSE),
('a1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 5, FALSE), -- FRIDAY === 5
('a1000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 6, TRUE), -- SATURDAY === 6
('a1000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 7, TRUE); -- SUNDAY === 7

-- Berlin Studio
INSERT INTO day_schedules (id, weekly_schedule_id, day_of_week, is_closed) VALUES
('a1000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 1, FALSE),
('a1000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', 2, FALSE),
('a1000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', 3, FALSE),
('a1000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', 4, FALSE),
('a1000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', 5, FALSE),
('a1000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000002', 6, FALSE),
('a1000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000002', 7, TRUE);

-- London Studio
INSERT INTO day_schedules (id, weekly_schedule_id, day_of_week, is_closed) VALUES
('a1000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000003', 1, FALSE),
('a1000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000003', 2, FALSE),
('a1000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000003', 3, FALSE),
('a1000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000003', 4, FALSE),
('a1000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000003', 5, FALSE),
('a1000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000003', 6, TRUE),
('a1000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000003', 7, TRUE);

-- New York Studio
INSERT INTO day_schedules (id, weekly_schedule_id, day_of_week, is_closed) VALUES
('a1000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000004', 1, FALSE),
('a1000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000004', 2, FALSE),
('a1000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000004', 3, FALSE),
('a1000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-000000000004', 4, FALSE),
('a1000000-0000-0000-0000-000000000026', 'a0000000-0000-0000-0000-000000000004', 5, FALSE),
('a1000000-0000-0000-0000-000000000027', 'a0000000-0000-0000-0000-000000000004', 6, FALSE),
('a1000000-0000-0000-0000-000000000028', 'a0000000-0000-0000-0000-000000000004', 7, TRUE);

-- =========================================================
-- TIME INTERVALS (Typical Opening Hours)
-- =========================================================

-- Belgrade: 10:00-19:00 Mon-Fri
INSERT INTO time_intervals (id, day_schedule_id, start_time, end_time) VALUES
('a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '10:00', '19:00'),
('a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', '10:00', '19:00'),
('a2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', '10:00', '19:00'),
('a2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', '10:00', '19:00'),
('a2000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000005', '10:00', '19:00');

-- Berlin: 09:00-20:00 Mon-Sat
INSERT INTO time_intervals (id, day_schedule_id, start_time, end_time) VALUES
('a2000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000008', '09:00', '20:00'),
('a2000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000009', '09:00', '20:00'),
('a2000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000010', '09:00', '20:00'),
('a2000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000011', '09:00', '20:00'),
('a2000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000012', '09:00', '20:00'),
('a2000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000013', '09:00', '20:00');

-- London: 11:00-18:00 Mon-Fri
INSERT INTO time_intervals (id, day_schedule_id, start_time, end_time) VALUES
('a2000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000015', '11:00', '18:00'),
('a2000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000016', '11:00', '18:00'),
('a2000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000017', '11:00', '18:00'),
('a2000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000018', '11:00', '18:00'),
('a2000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000019', '11:00', '18:00');

-- New York: 10:00-21:00 Mon-Fri, 11:00-16:00 Sat
INSERT INTO time_intervals (id, day_schedule_id, start_time, end_time) VALUES
('a2000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000022', '10:00', '21:00'),
('a2000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000023', '10:00', '21:00'),
('a2000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000024', '10:00', '21:00'),
('a2000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000025', '10:00', '21:00'),
('a2000000-0000-0000-0000-000000000021', 'a1000000-0000-0000-0000-000000000026', '10:00', '21:00'),
('a2000000-0000-0000-0000-000000000022', 'a1000000-0000-0000-0000-000000000027', '11:00', '16:00');

-- =========================================================
-- SCHEDULE EXCEPTIONS
-- =========================================================

INSERT INTO schedule_exceptions (id, studio_id, label, is_closed) VALUES
('b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'New Year', TRUE),
('b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Berlin Marathon', TRUE),
('b0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'Bank Holiday', TRUE),
('b0000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'Thanksgiving', TRUE);

-- =========================================================
-- EXCEPTION DATE RULES
-- =========================================================

-- Belgrade: One-off closure Jan 1
INSERT INTO exception_date_rules (id, exception_id, type, date) VALUES
('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'oneOff', '2026-01-01');

-- Berlin: Marathon (single day)
INSERT INTO exception_date_rules (id, exception_id, type, date) VALUES
('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'oneOff', '2026-09-27');

-- London: Bank Holiday (range)
INSERT INTO exception_date_rules (id, exception_id, type, start_date, end_date) VALUES
('b1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'range', '2026-08-28', '2026-08-28');

-- New York: Thanksgiving (annual)
INSERT INTO exception_date_rules (id, exception_id, type, month, day) VALUES
('b1000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 'annual', 11, 26);

-- =========================================================
-- 3. OWNERS (Single owner per studio)
-- =========================================================

INSERT INTO owners (id, first_name, last_name, email, password_hash, setup_state, status, studio_id) VALUES
-- Glamour Nails Belgrade
('30000000-0000-0000-0000-000000000001', 'Marko', 'Petrović', 'marko@glamournails.rs', '$2a$10$hashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhash', 'COMPLETED', 'ACTIVE', '20000000-0000-0000-0000-000000000001'),
-- Chic Nail Studio Berlin
('30000000-0000-0000-0000-000000000002', 'Hans', 'Müller', 'hans@chicnails.de', '$2a$10$hashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhash', 'COMPLETED', 'ACTIVE', '20000000-0000-0000-0000-000000000002'),
-- Polish & Pamper London
('30000000-0000-0000-0000-000000000003', 'James', 'Thompson', 'james@polishpamper.co.uk', '$2a$10$hashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhashhash', 'COMPLETED', 'ACTIVE', '20000000-0000-0000-0000-000000000003'),
-- Manhattan Nail Bar
('30000000-0000-0000-0000-000000000004', 'Michael', 'Ross', 'mike@manhattannailbar.com', '$2a$12$verylongpasswordwithmanycharactersandnumbersandspecialsymbols!@#$%^&*()', 'COMPLETED', 'ACTIVE', '20000000-0000-0000-0000-000000000004');

-- =========================================================
-- 4. PLANS (Multiple tiers with currencies)
-- =========================================================

INSERT INTO plans (id, name, price, currency, billing_interval, paddle_product_id, paddle_price_id) VALUES
-- EUR Plans
('40000000-0000-0000-0000-000000000001', 'Basic Monthly', 19.99, 'EUR', 'monthly', 'prod_basic_eur', 'pri_basic_monthly_eur'),
('40000000-0000-0000-0000-000000000002', 'Basic Annual', 199.99, 'EUR', 'yearly', 'prod_pro_eur', 'pri_basic_annual_eur'),
('40000000-0000-0000-0000-000000000003', 'Pro Monthly', 24.99, 'EUR', 'monthly', 'prod_pro_eur', 'pri_pro_monthly_eur'),
('40000000-0000-0000-0000-000000000004', 'Pro Annual', 249.99, 'EUR', 'yearly', 'prod_pro_eur', 'pri_pro_annual_eur'),
-- GBP Plans (UK)
('40000000-0000-0000-0000-000000000005', 'Basic Monthly', 19.99, 'GBP', 'monthly', 'prod_basic_gbp', 'pri_basic_monthly_gbp'),
('40000000-0000-0000-0000-000000000006', 'Basic Annual', 199.99, 'GBP', 'yearly', 'prod_pro_eur', 'pri_basic_annual_gbp'),
('40000000-0000-0000-0000-000000000007', 'Pro Monthly', 24.99, 'GBP', 'monthly', 'prod_pro_gbp', 'pri_pro_monthly_gbp'),
('40000000-0000-0000-0000-000000000008', 'Pro Annual', 249.99, 'GBP', 'yearly', 'prod_pro_eur', 'pri_pro_annual_gbp');

-- =========================================================
-- 5. OWNER SUBSCRIPTIONS (Various states and cycles)
-- =========================================================

INSERT INTO owner_subscriptions (id, owner_id, plan_id, paddle_customer_id, paddle_subscription_id, status, current_period_start, current_period_end) VALUES
-- Active subscriptions
('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'cus_marko_001', 'sub_marko_001', 'ACTIVE', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days'),
('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003', 'cus_hans_001', 'sub_hans_001', 'ACTIVE', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days'),
('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000006', 'cus_james_001', 'sub_james_001', 'ACTIVE', NOW() - INTERVAL '3 days', NOW() + INTERVAL '27 days'),
('50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000008', 'cus_mike_001', 'sub_mike_001', 'ACTIVE', NOW() - INTERVAL '7 days', NOW() + INTERVAL '23 days');
-- Past due (payment failed)
-- ('50000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000002', 'cus_hans_002', 'sub_hans_002', 'PAST_DUE', NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days'),
-- Canceled subscription
-- ('50000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001', 'cus_marko_002', 'sub_marko_002', 'CANCELLED', NOW() - INTERVAL '90 days', NOW() - INTERVAL '60 days'),
-- Trial subscription
-- ('50000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000006', 'cus_james_002', 'sub_james_002', 'TRIALING', NOW() - INTERVAL '2 days', NOW() + INTERVAL '12 days'),
-- Annual subscription
-- ('50000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000011', 'cus_mike_002', 'sub_mike_002', 'ACTIVE', NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days');

-- =========================================================
-- 6. CATEGORIES (Nail service categories per studio)
-- =========================================================

INSERT INTO studio_categories (id, studio_id, name, display_order) VALUES
-- Glamour Nails Belgrade
('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Manicure', 0),
('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Pedicure', 1),
('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Nail Extensions', 2),
('60000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'Nail Art & Design', 3),
('60000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'Treatments & Care', 4),
-- Chic Nail Studio Berlin
('60000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', 'Manicure', 0),
('60000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', 'Pedicure', 1),
('60000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002', 'Gel & Acrylic', 2),
('60000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000002', 'Nail Art', 3),
-- Polish & Pamper London
('60000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000003', 'Luxury Manicure', 0),
('60000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000003', 'Luxury Pedicure', 1),
('60000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000003', 'Extensions & Overlays', 2),
('60000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000003', 'BIAB & Builder Gel', 3),
-- Manhattan Nail Bar
('60000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000004', 'Executive Manicure', 0),
('60000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000004', 'Spa Pedicure', 1),
('60000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000004', 'Acrylics & Gels', 2),
('60000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000004', 'Nail Repair & Care', 3);

-- =========================================================
-- 7. STUDIO SERVICES (Nail services with durations/prices)
-- =========================================================

INSERT INTO studio_services (id, studio_id, name, link, price, currency, duration_minutes, thumbnail, type) VALUES
-- Glamour Nails Belgrade (EUR)
('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Classic Manicure', 'classic-manicure', 25.00, 'EUR', 45, 'cat2.jpg', '["100", "101", "102"]'),
('70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Gel Manicure', 'gel-manicure', 35.00, 'EUR', 60, 'spletka-test.jpg', '["100", "102", "103"]'),
('70000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Luxury Pedicure', 'luxury-pedicure', 45.00, 'EUR', 75, 'spletka-test.jpg', '["104", "105", "106"]'),
('70000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'Acrylic Full Set', 'acrylic-full-set', 55.00, 'EUR', 90, 'spletka-test.jpg', '["107", "108"]'),
('70000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'Nail Art Design', 'nail-art', 15.00, 'EUR', 30, 'spletka-test.jpg', '["109", "108"]'),
('70000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', 'Paraffin Treatment', 'paraffin-treatment', 20.00, 'EUR', 30, 'spletka-test.jpg', '["106", "108"]'),
-- Chic Nail Studio Berlin (EUR)
('70000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', 'Express Manicure', 'express-manicure', 20.00, 'EUR', 30, 'spletka-test.jpg', '["203", "204"]'),
('70000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002', 'Shellac Manicure', 'shellac-manicure', 40.00, 'EUR', 60, 'spletka-test.jpg', '["205", "206"]'),
('70000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000002', 'Spa Pedicure', 'spa-pedicure', 50.00, 'EUR', 75, 'spletka-test.jpg', '["206", "207"]'),
('70000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000002', 'Acrylic Refill', 'acrylic-refill', 35.00, 'EUR', 60, 'spletka-test.jpg', '["205", "206"]'),
('70000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000002', 'Custom Nail Art', 'custom-nail-art', 25.00, 'EUR', 45, 'spletka-test.jpg', '["201", "205"]'),
-- Polish & Pamper London (GBP)
('70000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000003', 'Signature Manicure', 'signature-manicure', 35.00, 'GBP', 60, 'spletka-test.jpg', '["302", "307"]'),
('70000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000003', 'Deluxe Pedicure', 'deluxe-pedicure', 55.00, 'GBP', 75, 'spletka-test.jpg', '["303", "306"]'),
('70000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000003', 'BIAB Overlay', 'biab-overlay', 45.00, 'GBP', 60, 'spletka-test.jpg', '["304", "305"]'),
('70000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000003', 'Builder Gel Extensions', 'builder-gel', 60.00, 'GBP', 90, 'spletka-test.jpg', '["301", "302"]'),
('70000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000003', 'Chrome & Effects', 'chrome-effects', 20.00, 'GBP', 30, 'spletka-test.jpg', '["300", "304"]'),
-- Manhattan Nail Bar (USD)
('70000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000004', 'Executive Manicure', 'executive-manicure', 75.00, 'USD', 60, 'spletka-test.jpg', '["400", "402"]'),
('70000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000004', 'Executive Pedicure', 'executive-pedicure', 95.00, 'USD', 75, 'spletka-test.jpg', '["401"]'),
('70000000-0000-0000-0000-000000000019', '20000000-0000-0000-0000-000000000004', 'Acrylic Full Set', 'acrylic-full-set', 85.00, 'USD', 90, 'spletka-test.jpg', '["402"]'),
('70000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000004', 'Gel-X Extensions', 'gel-x-extensions', 120.00, 'USD', 90, 'spletka-test.jpg', '["403"]'),
('70000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000004', 'Nail Repair', 'nail-repair', 35.00, 'USD', 30, 'spletka-test.jpg', '["404"]');

INSERT INTO service_images(id, service_id, key, display_order) VALUES
('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'cat2.jpg', 1),
('71000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'cat2.jpg', 2),
('71000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000001', 'cat2.jpg', 3),
('71000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000002', 'spletka-test-2.jpg', 1),
('71000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000002', 'spletka-test-2.jpg', 2),
('71000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000002', 'spletka-test-2.jpg', 3),
('71000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000003', 'spletka-test-2.jpg', 1),
('71000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000003', 'spletka-test-2.jpg', 2),
('71000000-0000-0000-0000-000000000009', '70000000-0000-0000-0000-000000000003', 'spletka-test-2.jpg', 3),
('71000000-0000-0000-0000-000000000010', '70000000-0000-0000-0000-000000000004', 'spletka-test-2.jpg', 1),
('71000000-0000-0000-0000-000000000011', '70000000-0000-0000-0000-000000000004', 'spletka-test-2.jpg', 2),
('71000000-0000-0000-0000-000000000012', '70000000-0000-0000-0000-000000000004', 'spletka-test-2.jpg', 3);

-- =========================================================
-- 8. STUDIO PACKAGES (Nail service bundles)
-- =========================================================

INSERT INTO studio_packages (id, studio_id, name, link, price, currency, duration_minutes) VALUES
-- Glamour Nails Belgrade
('80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Mani-Pedi Combo', 'mani-pedi-combo', 60.00, 'EUR', 105),
('80000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Gel Manicure Pack (3)', 'gel-manicure-pack', 90.00, 'EUR', 180),
('80000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Monthly Unlimited', 'unlimited-monthly', 149.00, 'EUR', 180),
-- Chic Nail Studio Berlin
('80000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'Starter Pack (2 visits)', 'starter-pack', 55.00, 'EUR', 90),
('80000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'Regular Client Pack (5)', 'regular-pack', 130.00, 'EUR', 225),
('80000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', 'Annual Membership', 'annual-membership', 499.00, 'EUR', 225),
-- Polish & Pamper London
('80000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000003', 'BIAB Bundle (3)', 'biab-bundle', 120.00, 'GBP', 180),
('80000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000003', 'Luxury Experience', 'luxury-experience', 80.00, 'GBP', 120),
('80000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000003', 'Monthly Pass', 'monthly-pass', 180.00, 'GBP', 180),
-- Manhattan Nail Bar
('80000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000004', 'Executive Package', 'executive-package', 150.00, 'USD', 120),
('80000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000004', 'Corporate Wellness', 'corporate-wellness', 450.00, 'USD', 360);

-- =========================================================
-- 9. CATEGORY ↔ SERVICE MAPPINGS
-- =========================================================

INSERT INTO category_services (category_id, service_id) VALUES
-- Glamour Nails Belgrade mappings
('60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001'), -- Manicure -> Classic
('60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002'), -- Manicure -> Gel
('60000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000003'), -- Pedicure -> Luxury
('60000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000004'), -- Extensions -> Acrylic Full
('60000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000005'), -- Nail Art -> Design
('60000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000006'), -- Treatments -> Paraffin
-- Chic Nail Studio Berlin mappings
('60000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000007'), -- Manicure -> Express
('60000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000008'), -- Manicure -> Shellac
('60000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000009'), -- Pedicure -> Spa
('60000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000010'), -- Gel & Acrylic -> Refill
('60000000-0000-0000-0000-000000000009', '70000000-0000-0000-0000-000000000011'), -- Nail Art -> Custom
-- Polish & Pamper London mappings
('60000000-0000-0000-0000-000000000010', '70000000-0000-0000-0000-000000000012'), -- Luxury Manicure -> Signature
('60000000-0000-0000-0000-000000000011', '70000000-0000-0000-0000-000000000013'), -- Luxury Pedicure -> Deluxe
('60000000-0000-0000-0000-000000000012', '70000000-0000-0000-0000-000000000015'), -- Extensions -> Builder Gel
('60000000-0000-0000-0000-000000000013', '70000000-0000-0000-0000-000000000014'), -- BIAB -> Overlay
-- Manhattan Nail Bar mappings
('60000000-0000-0000-0000-000000000014', '70000000-0000-0000-0000-000000000017'), -- Executive -> Manicure
('60000000-0000-0000-0000-000000000015', '70000000-0000-0000-0000-000000000018'), -- Spa -> Pedicure
('60000000-0000-0000-0000-000000000016', '70000000-0000-0000-0000-000000000019'), -- Acrylics -> Full Set
('60000000-0000-0000-0000-000000000017', '70000000-0000-0000-0000-000000000021'); -- Repair -> Nail Repair

-- =========================================================
-- 10. SERVICE ↔ PACKAGE MAPPINGS
-- =========================================================

INSERT INTO service_packages (service_id, package_id) VALUES
-- Glamour Nails packages
('70000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001'), -- Classic in Mani-Pedi
('70000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000001'), -- Pedicure in Mani-Pedi
('70000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001'), -- Gel in Mani-Pedi
('70000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002'), -- Gel in 3-pack
('70000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000002'), -- Pedicure in 3-pack
('70000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000003'), -- Gel in Unlimited
('70000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000003'), -- Acrylic in Unlimited
-- Chic Nail Studio packages
('70000000-0000-0000-0000-000000000007', '80000000-0000-0000-0000-000000000004'), -- Express in Starter
('70000000-0000-0000-0000-000000000008', '80000000-0000-0000-0000-000000000004'), -- Express in Starter
('70000000-0000-0000-0000-000000000008', '80000000-0000-0000-0000-000000000005'), -- Shellac in Regular
('70000000-0000-0000-0000-000000000007', '80000000-0000-0000-0000-000000000005'), -- Shellac in Regular
('70000000-0000-0000-0000-000000000007', '80000000-0000-0000-0000-000000000006'), -- Shellac in Annual
('70000000-0000-0000-0000-000000000008', '80000000-0000-0000-0000-000000000006'), -- Shellac in Annual
-- Polish & Pamper packages
('70000000-0000-0000-0000-000000000014', '80000000-0000-0000-0000-000000000007'), -- BIAB in Bundle
('70000000-0000-0000-0000-000000000012', '80000000-0000-0000-0000-000000000008'), -- Signature in Luxury
-- Manhattan Nail Bar packages
('70000000-0000-0000-0000-000000000017', '80000000-0000-0000-0000-000000000010'), -- Executive in Package
('70000000-0000-0000-0000-000000000017', '80000000-0000-0000-0000-000000000011'); -- Executive in Corporate

-- =========================================================
-- 11. SERVICE ADDONS (Nail service extras)
-- =========================================================

INSERT INTO service_addons (id, service_id, name, price, duration_delta_minutes) VALUES
-- Glamour Nails addons
('90000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'French Tips', 10.00, 15),
('90000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'Nail Art (per nail)', 5.00, 5),
('90000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', 'Callus Removal', 15.00, 15),
('90000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000004', 'Ombre Design', 20.00, 20),
-- Chic Nail Studio addons
('90000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000008', 'Chrome Powder', 12.00, 10),
('90000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000009', 'Hot Stone Massage', 18.00, 15),
-- Polish & Pamper addons
('90000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000012', 'Cuticle Care Premium', 8.00, 10),
('90000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000014', 'Nail Strengthening', 10.00, 10),
-- Manhattan Nail Bar addons
('90000000-0000-0000-0000-000000000009', '70000000-0000-0000-0000-000000000017', 'Hand Massage', 25.00, 15),
('90000000-0000-0000-0000-000000000010', '70000000-0000-0000-0000-000000000018', 'Paraffin Wax Treatment', 30.00, 15);

-- =========================================================
-- 13. RESERVATIONS (Nail appointment scenarios)
-- =========================================================

INSERT INTO reservations (
    id, user_id, studio_id, service_id, price, currency, discount, duration_minutes,
    contact_phone, additional_note, country, city, address, latitude, longitude, time_zone, status, confirmation_expires_at
) VALUES
-- Past completed appointments
('d0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 35.00, 'EUR', 0, 60, '+381601234567', 'First gel manicure', 'Serbia', 'Belgrade', 'Knez Mihailova 10', 44.7866, 20.4489, 'Europe/Belgrade', 'COMPLETED', NOW() - INTERVAL '5 days'),
('d0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000004', 55.00, 'EUR', 10.00, 90, '+381642345678', 'Want coffin shape', 'Serbia', 'Belgrade', 'Bulevar Kralja Aleksandra 50', 44.8059, 20.4661, 'Europe/Belgrade', 'COMPLETED', NOW() - INTERVAL '5 days'),
('d0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000008', 40.00, 'EUR', 0, 60, '+4915112345678', 'Allergic to certain gels', 'Germany', 'Berlin', 'Alexanderplatz 1', 52.5219, 13.4132, 'Europe/Berlin', 'COMPLETED', NOW() - INTERVAL '5 days'),
-- Today's appointments (TOO CLOSE)
('d0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000009', 50.00, 'EUR', 0, 75, '+4915223456789', 'Bring sandals', 'Germany', 'Berlin', 'Friedrichstraße 100', 52.5200, 13.4050, 'Europe/Berlin', 'CONFIRMED', NOW() - INTERVAL '5 days'),
('d0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000017', 75.00, 'USD', 0, 60, '+12125551234', 'Lunch break appointment', 'USA', 'New York', '5th Avenue 100', 40.7484, -73.9857, 'America/New_York', 'CONFIRMED', NOW() - INTERVAL '5 days'),
-- Upcoming appointments (NOT TOO CLOSE)
('d0000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000019', 85.00, 'USD', 5.00, 90, '+13105552345', 'Special occasion', 'USA', 'New York', 'Broadway 200', 40.7614, -73.9776, 'America/New_York', 'CONFIRMED', NOW() - INTERVAL '5 days'),
('d0000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000012', 35.00, 'GBP', 0, 60, '+447700123456', 'Weak nails, need care', 'United Kingdom', 'London', 'Oxford Street 50', 51.5150, -0.1440, 'Europe/London', 'PENDING_CONFIRMATION', NOW() - INTERVAL '5 days'),
('d0000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000015', 60.00, 'GBP', 15.00, 90, '+447711234567', 'Wedding nails', 'United Kingdom', 'London', 'Carnaby Street 10', 51.5133, -0.1387, 'Europe/London', 'CONFIRMED', NOW() - INTERVAL '5 days'),
('d0000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 25.00, 'EUR', 0, 45, '+33612345678', 'Quick touch up', 'Serbia', 'Belgrade', 'Skadarska 20', 44.8186, 20.4633, 'Europe/Belgrade', 'CONFIRMED', NOW() - INTERVAL '5 days'),
-- Cancelled appointment
('d0000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000006', 20.00, 'EUR', 0, 30, '+381601234567', 'Cancelled - changed mind', 'Serbia', 'Belgrade', 'Knez Mihailova 10', 44.7866, 20.4489, 'Europe/Belgrade', 'USER_CANCELLED', NOW() - INTERVAL '5 days'),
-- No-show
('d0000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000010', 35.00, 'EUR', 0, 60, '+4915112345678', 'Did not arrive', 'Germany', 'Berlin', 'Potsdamer Platz 1', 52.5096, 13.3760, 'Europe/Berlin', 'MISSED', NOW() - INTERVAL '5 days');

-- =========================================================
-- 14. RESERVATION TIMESLOTS
-- =========================================================

INSERT INTO reservation_timeslots (reservation_id, reservation_date, start_time, end_time) VALUES
-- Past appointments
('d0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '15 days', '10:00', '11:00'),
('d0000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '10 days', '14:00', '15:30'),
('d0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '5 days', '09:00', '10:00'),
-- Today
('d0000000-0000-0000-0000-000000000004', CURRENT_DATE, '18:00', '19:15'),
('d0000000-0000-0000-0000-000000000005', CURRENT_DATE, '12:00', '13:00'),
-- Upcoming
('d0000000-0000-0000-0000-000000000006', CURRENT_DATE + INTERVAL '3 days', '10:00', '11:30'),
('d0000000-0000-0000-0000-000000000007', CURRENT_DATE + INTERVAL '7 days', '16:00', '17:00'),
('d0000000-0000-0000-0000-000000000008', CURRENT_DATE + INTERVAL '14 days', '11:00', '12:30'),
('d0000000-0000-0000-0000-000000000009', CURRENT_DATE + INTERVAL '21 days', '09:00', '09:45'),
-- Cancelled
('d0000000-0000-0000-0000-000000000010', CURRENT_DATE + INTERVAL '1 day', '15:00', '15:30'),
-- No-show
('d0000000-0000-0000-0000-000000000011', CURRENT_DATE - INTERVAL '1 day', '11:00', '12:00');


-- ============================================================================
-- ADDITIONAL RESERVATIONS FOR TEST STUDIO 20000000-0000-0000-0000-000000000001
-- ============================================================================

INSERT INTO reservations (
    id, user_id, studio_id, service_id, price, currency, discount, duration_minutes,
    contact_phone, additional_note, country, city, address, latitude, longitude, time_zone,
    status, confirmation_expires_at
) VALUES

-- Past completed
('d0000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 35.00, 'EUR', 0, 60, '+381641112223', 'Classic gel refill', 'Serbia', 'Belgrade', 'Knez Mihailova 10', 44.7866, 20.4489, 'Europe/Belgrade', 'COMPLETED', NOW() - INTERVAL '5 days'),
('d0000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000004', 55.00, 'EUR', 5, 90, '+381641112224', 'Almond shape request', 'Serbia', 'Belgrade', 'Knez Mihailova 10', 44.7866, 20.4489, 'Europe/Belgrade', 'COMPLETED', NOW() - INTERVAL '5 days'),
('d0000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 25.00, 'EUR', 0, 45, '+381641112225', 'Quick polish', 'Serbia', 'Belgrade', 'Knez Mihailova 10', 44.7866, 20.4489, 'Europe/Belgrade', 'COMPLETED', NOW() - INTERVAL '5 days'),
-- Today
('d0000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 35.00, 'EUR', 0, 90, '+381641112226', 'Simple manicure', 'Serbia', 'Belgrade', 'Knez Mihailova 10', 44.7866, 20.4489, 'Europe/Belgrade', 'CONFIRMED', NOW() - INTERVAL '6 hour'),
('d0000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 35.00, 'EUR', 0, 60, '+381641112226', 'Simple manicure', 'Serbia', 'Belgrade', 'Knez Mihailova 10', 44.7866, 20.4489, 'Europe/Belgrade', 'CONFIRMED', NOW() - INTERVAL '1 hour'),
('d0000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000006', 20.00, 'EUR', 0, 30, '+381641112227', 'Repair broken nail', 'Serbia', 'Belgrade', 'Knez Mihailova 10', 44.7866, 20.4489, 'Europe/Belgrade', 'PENDING_CONFIRMATION', NOW() + INTERVAL '30 minutes'),
-- Upcoming
('d0000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000004', 55.00, 'EUR', 10, 90, '+381641112228', 'Birthday nails', 'Serbia', 'Belgrade', 'Knez Mihailova 10', 44.7866, 20.4489, 'Europe/Belgrade', 'CONFIRMED', NOW() + INTERVAL '1 day'),
('d0000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 35.00, 'EUR', 0, 60, '+381641112229', 'Neutral colors', 'Serbia', 'Belgrade', 'Knez Mihailova 10', 44.7866, 20.4489, 'Europe/Belgrade', 'CONFIRMED', NOW() + INTERVAL '1 day'),
('d0000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000004', 55.00, 'EUR', 0, 90, '+381641112230', 'Long extensions', 'Serbia', 'Belgrade', 'Knez Mihailova 10', 44.7866, 20.4489, 'Europe/Belgrade', 'CONFIRMED', NOW() + INTERVAL '1 day'),
('d0000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 25.00, 'EUR', 0, 45, '+381641112231', 'Routine manicure', 'Serbia', 'Belgrade', 'Knez Mihailova 10', 44.7866, 20.4489, 'Europe/Belgrade', 'CONFIRMED', NOW() + INTERVAL '2 days'),
-- Cancelled
('d0000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 35.00, 'EUR', 0, 60, '+381641112232', 'User cancelled due to travel', 'Serbia', 'Belgrade', 'Knez Mihailova 10', 44.7866, 20.4489, 'Europe/Belgrade', 'USER_CANCELLED', NOW() + INTERVAL '1 day'),
-- Missed
('d0000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 35.00, 'EUR', 0, 60, '+381641112233', 'Client did not show', 'Serbia', 'Belgrade', 'Knez Mihailova 10', 44.7866, 20.4489, 'Europe/Belgrade', 'CONFIRMED', NOW() - INTERVAL '1 day');

INSERT INTO reservation_timeslots (reservation_id, reservation_date, start_time, end_time) VALUES
('d0000000-0000-0000-0000-000000000012', CURRENT_DATE - INTERVAL '20 days', '11:00', '12:00'),
('d0000000-0000-0000-0000-000000000013', CURRENT_DATE - INTERVAL '18 days', '14:00', '15:30'),
('d0000000-0000-0000-0000-000000000014', CURRENT_DATE - INTERVAL '12 days', '09:30', '10:15'),
('d0000000-0000-0000-0000-000000000015', CURRENT_DATE, '19:00', '20:30'),
('d0000000-0000-0000-0000-000000000016', CURRENT_DATE, '20:30', '21:30'),
('d0000000-0000-0000-0000-000000000017', CURRENT_DATE, '21:30', '22:00'),
('d0000000-0000-0000-0000-000000000018', CURRENT_DATE + INTERVAL '1 day', '10:00', '11:30'),
('d0000000-0000-0000-0000-000000000019', CURRENT_DATE + INTERVAL '1 day', '12:00', '13:00'),
('d0000000-0000-0000-0000-000000000020', CURRENT_DATE + INTERVAL '1 day', '15:00', '16:30'),
('d0000000-0000-0000-0000-000000000021', CURRENT_DATE + INTERVAL '2 days', '11:00', '11:45'),
('d0000000-0000-0000-0000-000000000022', CURRENT_DATE + INTERVAL '3 days', '17:00', '18:00'),
('d0000000-0000-0000-0000-000000000023', CURRENT_DATE - INTERVAL '1 day', '12:00', '13:00');


-- =========================================================
-- 15. RESERVATION ADDONS
-- =========================================================

INSERT INTO reservation_addons (reservation_id, addon_id) VALUES
-- Single addon
('d0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001'),
-- Multiple addons
('d0000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000002'),
('d0000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000003'),
-- Different addons
('d0000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000005'),
('d0000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000006'),
('d0000000-0000-0000-0000-000000000005', '90000000-0000-0000-0000-000000000009'),
('d0000000-0000-0000-0000-000000000006', '90000000-0000-0000-0000-000000000009'),
('d0000000-0000-0000-0000-000000000008', '90000000-0000-0000-0000-000000000008');

-- =========================================================
-- 16. RESERVATION RATINGS
-- =========================================================

INSERT INTO reservation_ratings (reservation_id, rating, comment) VALUES
-- 5-star ratings
('d0000000-0000-0000-0000-000000000001', 5, 'Perfect gel manicure, lasted 3 weeks!'),
-- 4-star rating
('d0000000-0000-0000-0000-000000000002', 4, 'Great acrylics, took a bit longer than expected'),
-- No comment
('d0000000-0000-0000-0000-000000000004', 5, NULL);

-- =========================================================
-- 17. SUBSCRIPTION INVOICES
-- =========================================================

INSERT INTO subscription_invoices (
    id, owner_subscription_id, paddle_invoice_id, amount, currency, status, billed_at, paid_at
) VALUES
-- Paid invoices
('e0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'inv_marko_001', 49.99, 'EUR', 'PAID', NOW() - INTERVAL '35 days', NOW() - INTERVAL '34 days'),
('e0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'inv_marko_002', 49.99, 'EUR', 'PAID', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
('e0000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 'inv_hans_001', 49.99, 'EUR', 'PAID', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
('e0000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', 'inv_james_001', 44.99, 'GBP', 'PAID', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
('e0000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000004', 'inv_mike_001', 59.99, 'USD', 'PAID', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days');
-- Unpaid invoice
--('e0000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000005', 'inv_hans_002', 49.99, 'EUR', 'UNPAID', NOW() - INTERVAL '35 days', NULL),
-- Refunded
--('e0000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000006', 'inv_marko_old_001', 29.99, 'EUR', 'REFUNDED', NOW() - INTERVAL '90 days', NOW() - INTERVAL '89 days'),
-- Annual
--('e0000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000008', 'inv_mike_annual_001', 349.99, 'USD', 'PAID', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days');

-- =========================================================
-- 18. PAYMENT EVENTS
-- =========================================================

INSERT INTO payment_events (id, paddle_event_id, event_type, owner_subscription_id, raw_payload) VALUES
('f0000000-0000-0000-0000-000000000001', 'evt_marko_created', 'subscription.created', '50000000-0000-0000-0000-000000000001', '{"subscription_id": "sub_marko_001", "plan_id": "pri_pro_monthly_eur", "status": "active"}'),
('f0000000-0000-0000-0000-000000000002', 'evt_marko_activated', 'subscription.activated', '50000000-0000-0000-0000-000000000001', '{"subscription_id": "sub_marko_001", "activation_date": "2024-01-15T10:00:00Z"}'),
('f0000000-0000-0000-0000-000000000003', 'evt_marko_payment_success', 'payment.succeeded', '50000000-0000-0000-0000-000000000001', '{"invoice_id": "inv_marko_002", "amount": "49.99", "currency": "EUR"}'),
('f0000000-0000-0000-0000-000000000004', 'evt_hans_payment_success', 'payment.succeeded', '50000000-0000-0000-0000-000000000002', '{"invoice_id": "inv_hans_001", "amount": "49.99", "currency": "EUR"}'),
('f0000000-0000-0000-0000-000000000006', 'evt_marko_updated', 'subscription.updated', '50000000-0000-0000-0000-000000000001', '{"subscription_id": "sub_marko_001", "update_type": "payment_method_changed"}');
--('f0000000-0000-0000-0000-000000000008', 'evt_marko_refund', 'payment.refunded', '50000000-0000-0000-0000-000000000006', '{"invoice_id": "inv_marko_old_001", "refund_amount": "29.99", "reason": "customer_request"}'),
--('f0000000-0000-0000-0000-000000000007', 'evt_marko_old_canceled', 'subscription.canceled', '50000000-0000-0000-0000-000000000006', '{"subscription_id": "sub_marko_002", "cancellation_effective_date": "2024-03-15T00:00:00Z"}'),
--('f0000000-0000-0000-0000-000000000005', 'evt_hans_payment_failed', 'payment.failed', '50000000-0000-0000-0000-000000000005', '{"invoice_id": "inv_hans_002", "amount": "49.99", "error_code": "card_declined", "retry_count": 3}'),
--('f0000000-0000-0000-0000-000000000009', 'evt_james_trial_started', 'subscription.trialing', '50000000-0000-0000-0000-000000000007', '{"subscription_id": "sub_james_002", "trial_end": "2024-12-31T00:00:00Z"}');

-- =========================================================
-- DATA SUMMARY
-- =========================================================
-- Users: 11 (2 banned, 9 active)
-- Studios: 4 nail studios (Belgrade, Berlin, London, New York)
-- Owners: 4 (1 per studio, all ACTIVE/COMPLETED)
-- Plans: 11 (Basic/Pro/Enterprise across EUR/GBP/USD)
-- Subscriptions: 8 (ACTIVE, PAST_DUE, CANCELED, TRIAL)
-- Categories: 17 nail service categories
-- Services: 21 nail services (manicures, pedicures, extensions, art)
-- Packages: 11 service bundles
-- Reservations: 11 appointments (all statuses)
-- Invoices: 8 (PAID, UNPAID, REFUNDED)
-- Payment Events: 9 covering full lifecycle
-- =========================================================