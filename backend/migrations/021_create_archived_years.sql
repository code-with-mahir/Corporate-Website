-- Create archived_years table
CREATE TABLE IF NOT EXISTS archived_years (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE CASCADE,
    archived_data JSONB,
    archive_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    total_students INTEGER,
    total_classes INTEGER,
    total_sections INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_archived_years_school_id ON archived_years(school_id);
CREATE INDEX IF NOT EXISTS idx_archived_years_academic_year_id ON archived_years(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_archived_years_archive_date ON archived_years(archive_date);
CREATE INDEX IF NOT EXISTS idx_archived_years_school_year ON archived_years(school_id, academic_year_id);
