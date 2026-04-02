/**
 * OpenCLAW Client for ClaimRail
 * 
 * Connects to local OpenCLAW instance to automate BMI work registration
 */

const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://localhost:18789';
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY;

export interface BMIRegistrationData {
  workTitle: string;
  isrc?: string;
  writers: Array<{
    name: string;
    ipi?: string;
    pro?: string;
    share: number;
    role: 'writer' | 'composer' | 'publisher';
  }>;
  alternativeTitles?: string[];
  publishers?: Array<{
    name: string;
    share: number;
  }>;
}

export interface RegistrationResult {
  success: boolean;
  confirmationNumber?: string;
  error?: string;
  workId?: string;
}

/**
 * Register a work with BMI using OpenCLAW browser automation
 */
export async function registerWorkWithBMI(
  data: BMIRegistrationData,
  userCredentials: {
    username: string;
    password: string;
  }
): Promise<RegistrationResult> {
  try {
    // Send registration request to OpenCLAW
    const response = await fetch(`${OPENCLAW_URL}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_API_KEY}`,
      },
      body: JSON.stringify({
        skill: 'bmi-work-registration',
        params: {
          ...data,
          credentials: userCredentials,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenCLAW API error: ${error}`);
    }

    const result = await response.json();
    
    return {
      success: result.success,
      confirmationNumber: result.confirmationNumber,
      workId: result.workId,
      error: result.error,
    };
  } catch (error) {
    console.error('BMI registration failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check OpenCLAW connection status
 */
export async function checkOpenCLAWConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${OPENCLAW_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Validate BMI credentials by attempting login
 */
export async function validateBMICredentials(
  credentials: {
    username: string;
    password: string;
  }
): Promise<boolean> {
  try {
    const response = await fetch(`${OPENCLAW_URL}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_API_KEY}`,
      },
      body: JSON.stringify({
        skill: 'bmi-validate-login',
        params: { credentials },
      }),
    });

    const result = await response.json();
    return result.valid === true;
  } catch {
    return false;
  }
}

/**
 * Batch register multiple works with BMI
 */
export async function batchRegisterWorks(
  works: BMIRegistrationData[],
  userCredentials: {
    username: string;
    password: string;
  }
): Promise<RegistrationResult[]> {
  const results: RegistrationResult[] = [];

  for (const work of works) {
    const result = await registerWorkWithBMI(work, userCredentials);
    results.push(result);
    
    // Add delay between registrations to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}
