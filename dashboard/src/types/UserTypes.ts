export interface Department {
  id: string;
  name: string;
  code?: string;
}

export interface Role {
  id: string;
  name: string;
}

// Add to the Student interface in UserTypes.ts
export interface Student {
  id: string;
  userId: string;
  studentIdNumber: string;
  dateOfBirth: string;
  classId: string | null;
  gender: "male" | "female" | "other";
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    address: string;
  };
  busStopId?: string;
  busStop?: {
    id: string;
    stopName: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };

  // Joined relations
  user?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role?: {
      name: string;
    };
  } | null;
  class?: {
    id: string;
    classNameId?: string;
    educationLevel?: "grade" | "form";
    gradeId?: string;
    classname?: {
      id: string;
      name: string;
    };
    grade?: {
      id: string;
      name: string;
    };
  } | null;
  guardians?: Array<{
    id: string;
    userId: string;
    phone: string | null;
    email: string | null;
    occupation: string | null;
    address: string | null;
    gender: "male" | "female" | "other" | null;
    isActive: boolean;
    user?: {
      id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
    };
    guardianstudents?: {
      relationshipToStudent: string;
    };
  }> | null;
}

export interface Guardian {
  id: string;
  userId: string;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  address: string | null;
  gender: "male" | "female" | "other" | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;

  // Joined relations
  user?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    role?: {
      name: string;
    };
  } | null;
  guardianstudents?: {
    relationshipToStudent: string;
  } | null;
  students?: Array<{
    id: string;
    userId: string;
    studentIdNumber: string;
    dateOfBirth: string;
    gender: string;
    user?: {
      id: string;
      name: string;
    };
    guardianstudents?: {
      relationshipToStudent: string;
    };
  }> | null;
}

export interface CreateStudentPayload {
  classId: string;
  gender: "male" | "female" | "other";
  dateOfBirth: string;
  guardianName: string;
  relationshipToStudent: string;
  occupation: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianGender: "male" | "female" | "other";
  address: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
  alternativePhone: string;
}

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  experienceYears: number;
  phoneNumber: string;
  emergencyContact: EmergencyContact;
  status: string;
  medicalCertificateExpiry: string;
  joinDate: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** Joined User record — name lives here */
  user?: {
    id: string;
    name: string;
    role?: {
      name: string;
    };
  } | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  role?: {
    name: string;
  };
  isActive: boolean;
}

export interface CreateBusDriverPayload {
  // User fields
  name: string;
  email: string;
  phone: string;

  // Driver specific fields
  licenseNumber: string;
  experienceYears?: number | null;
  phoneNumber: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
    alternativePhone?: string;
  };
  status?: "active" | "on_leave" | "suspended" | "inactive";
  medicalCertificateExpiry?: string | null;
  joinDate?: string | null;
}

export interface UpdateBusDriverPayload {
  id: string;
  data: Partial<{
    name: string;
    email: string;
    phone: string;
    licenseNumber: string;
    experienceYears: number | null;
    phoneNumber: string;
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
      alternativePhone?: string;
    } | null;
    status: "active" | "on_leave" | "suspended" | "inactive";
    medicalCertificateExpiry: string | null;
    joinDate: string | null;
    isActive: boolean;
  }>;
}

// Add to UserTypes.ts

export interface DeactivateUserPayload {
  id: string;
  data: {
    isActive: boolean;
  };
}

export interface BulkDeactivatePayload {
  userIds: string[];
  data: {
    isActive: boolean;
  };
}

export interface UserState {
  users: User[] | null;
  students: Student[] | null;
  guardians: Guardian[] | null;
  drivers: Driver[] | null;
  currentUserProfile: {
    user: User | null;
    roleDetails: any; // You might want to type this more specifically
  } | null; // Add this
  roles: Role[] | null;
  error: string | null;
  isLoading: boolean;
  updateStatusLoading: boolean;
}

export interface UpdateUserStatusPayload {
  id: string;
  data: Partial<{
    email: string;
    phone: string;
    name: string;
    status: string;
  }>;
}
