-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    from_academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
    to_academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
    from_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    to_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    from_section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
    to_section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
    promotion_status VARCHAR(50) DEFAULT 'promoted',
    remarks TEXT,
    promoted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    promotion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_promotions_school_id ON promotions(school_id);
CREATE INDEX IF NOT EXISTS idx_promotions_student_id ON promotions(student_id);
CREATE INDEX IF NOT EXISTS idx_promotions_from_academic_year_id ON promotions(from_academic_year_id);
CREATE INDEX IF NOT EXISTS idx_promotions_to_academic_year_id ON promotions(to_academic_year_id);
CREATE INDEX IF NOT EXISTS idx_promotions_from_class_id ON promotions(from_class_id);
CREATE INDEX IF NOT EXISTS idx_promotions_to_class_id ON promotions(to_class_id);
CREATE INDEX IF NOT EXISTS idx_promotions_promotion_status ON promotions(promotion_status);
CREATE INDEX IF NOT EXISTS idx_promotions_school_student ON promotions(school_id, student_id);
