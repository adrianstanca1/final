import { Role, CompanyType, RegisterCredentials } from '../../types';

export type RegistrationStep = 'personal' | 'company' | 'role' | 'verify' | 'terms';

export interface RegistrationFormData extends Partial<RegisterCredentials> {
  confirmPassword?: string;
  companyName?: string;
  companyType?: CompanyType;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  companySelection?: 'create' | 'join';
  role?: Role;
  verificationCode?: string;
  termsAccepted?: boolean;
}

export interface CompanyData {
  name: string;
  type: CompanyType;
  email: string;
  phone: string;
  website: string;
}

export interface FormFieldErrors {
  [key: string]: string;
}