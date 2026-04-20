-- Create teacher_assignments table
CREATE TABLE IF NOT EXISTS teacher_assignments (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE CASCADE,
    is_class_teacher BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, class_id, section_id, subject_id, academic_year_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_school_id ON teacher_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher_id ON teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class_id ON teacher_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_section_id ON teacher_assignments(section_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_subject_id ON teacher_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_academic_year_id ON teacher_assignments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_is_class_teacher ON teacher_assignments(is_class_teacher);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_school_teacher ON teacher_assignments(school_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class_section ON teacher_assignments(class_id, section_id);
