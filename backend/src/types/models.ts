export interface School {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  logo?: string;
  subscription_id?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SuperAdmin {
  id: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Subscription {
  id: string;
  plan_name: string;
  duration_months: number;
  max_students: number;
  max_teachers: number;
  price: number;
  features: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  id: string;
  school_id: string;
  subscription_id: string;
  amount: number;
  payment_date: Date;
  payment_method: string;
  transaction_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  school_id: string;
  username: string;
  password: string;
  email: string;
  role_id: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Role {
  id: string;
  school_id: string;
  name: string;
  permissions: string[];
  created_at: Date;
  updated_at: Date;
}

export interface AcademicYear {
  id: string;
  school_id: string;
  year: string;
  start_date: Date;
  end_date: Date;
  is_current: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Class {
  id: string;
  school_id: string;
  name: string;
  academic_year_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Section {
  id: string;
  class_id: string;
  name: string;
  capacity?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Teacher {
  id: string;
  school_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth?: Date;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  qualification?: string;
  joining_date: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Student {
  id: string;
  school_id: string;
  user_id?: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  gender: 'male' | 'female' | 'other';
  email?: string;
  phone?: string;
  address?: string;
  section_id: string;
  admission_date: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Parent {
  id: string;
  school_id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  occupation?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ParentStudent {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: string;
  is_primary: boolean;
  created_at: Date;
}

export interface Attendance {
  id: string;
  student_id: string;
  section_id: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
  marked_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface Exam {
  id: string;
  school_id: string;
  name: string;
  academic_year_id: string;
  start_date: Date;
  end_date: Date;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Mark {
  id: string;
  exam_id: string;
  student_id: string;
  subject_id: string;
  marks_obtained: number;
  total_marks: number;
  grade?: string;
  remarks?: string;
  created_at: Date;
  updated_at: Date;
}

export interface FeeStructure {
  id: string;
  school_id: string;
  class_id: string;
  academic_year_id: string;
  fee_type: string;
  amount: number;
  due_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface FeePayment {
  id: string;
  student_id: string;
  fee_structure_id: string;
  amount_paid: number;
  payment_date: Date;
  payment_method: string;
  transaction_id?: string;
  status: 'pending' | 'completed' | 'partial' | 'failed';
  remarks?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Announcement {
  id: string;
  school_id: string;
  title: string;
  content: string;
  target_audience: string[];
  created_by: string;
  is_active: boolean;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Promotion {
  id: string;
  student_id: string;
  from_section_id: string;
  to_section_id: string;
  academic_year_id: string;
  promoted_by: string;
  promotion_date: Date;
  remarks?: string;
  created_at: Date;
}

export interface ArchivedYear {
  id: string;
  school_id: string;
  academic_year_id: string;
  archived_data: any;
  archived_by: string;
  archived_at: Date;
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  section_id: string;
  subject_id: string;
  academic_year_id: string;
  created_at: Date;
  updated_at: Date;
}
