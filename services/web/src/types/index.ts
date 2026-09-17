export type UserRole = 'ADMIN' | 'STUDENT';
export type WorkoutStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'OVERDUE' | 'CANCELED';
export type Gender = 'MALE' | 'FEMALE';

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  gender: Gender;
  subscriptionStatus: SubscriptionStatus;
};

export type CheckIn = {
  id: string;
  userId: string;
  painLevel: number;
  painLocation: string | null;
  fatigueLevel: number;
  weightKg: number | null;
  notes: string | null;
  photoUrls: string[];
  createdAt: string;
};

export type Anamnesis = {
  id: string;
  userId: string;
  goal: string;
  experience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  gender: Gender;
  weeklyDays: number;
  injuries: string[];
  availableEquip: string;
  createdAt: string;
  pending: boolean;
  user: Pick<User, 'id' | 'name' | 'email' | 'subscriptionStatus'>;
  latestPlan: { id: string; status: WorkoutStatus; createdAt: string } | null;
  latestCheckIn: Omit<CheckIn, 'userId' | 'photoUrls'> | null;
};

export type LastWorkoutLog = {
  weightUsed: number;
  repsDone: number;
  rpe: number | null;
  loggedAt: string;
};

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rir: number;
  restSeconds: number;
  cadence: string | null;
  notes: string | null;
  videoUrl: string | null;
  order: number;
  lastLog: LastWorkoutLog | null;
};

export type Split = {
  id: string;
  name: string;
  focus: string;
  order: number;
  exercises: Exercise[];
};

export type Workout = {
  id: string;
  userId: string;
  status: WorkoutStatus;
  rationale: string;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  splits: Split[];
};

export type WorkoutLog = {
  id: string;
  exercise: string;
  setNumber: number;
  weightUsed: number;
  repsDone: number;
  rpe: number | null;
  loggedAt: string;
};
