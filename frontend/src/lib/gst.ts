// ==============================================================================
// GST Utilities & State Code Mappings for Indian Tax Compliance
// Standard: CGST Act 2017 & SAC 998311 (Cloud & Software Services - 18% GST)
// ==============================================================================

export const SUPPLIER_GSTIN = '07AAAAA0000A1Z5'
export const SUPPLIER_STATE = 'Delhi'
export const SUPPLIER_STATE_CODE = '07'
export const SUPPLIER_NAME = 'Vaakriti Technologies Private Limited'

export interface GSTStateInfo {
  code: string
  name: string
}

export const INDIAN_GST_STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh'
}

/**
 * Validates a 15-character Indian GSTIN format.
 * Structure: 2 digits (State) + 10 alphanumeric (PAN) + 1 digit (Entity) + 'Z' + 1 checksum digit/char.
 */
export function validateGSTIN(gstin: string): { isValid: boolean; message?: string; state?: string; stateCode?: string } {
  if (!gstin || typeof gstin !== 'string') {
    return { isValid: false, message: 'GSTIN is required' }
  }

  const clean = gstin.trim().toUpperCase()
  if (clean.length !== 15) {
    return { isValid: false, message: 'GSTIN must be exactly 15 characters' }
  }

  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  if (!gstinRegex.test(clean)) {
    return { isValid: false, message: 'Invalid GSTIN format (e.g. 07AAAAA0000A1Z5)' }
  }

  const stateCode = clean.substring(0, 2)
  const stateName = INDIAN_GST_STATES[stateCode]
  if (!stateName) {
    return { isValid: false, message: `Invalid GST state code prefix: ${stateCode}` }
  }

  return {
    isValid: true,
    state: stateName,
    stateCode
  }
}

/**
 * Calculates GST breakdown for a given taxable amount (in Rupees or Paisa).
 * If the customer state is Delhi ('07') or not specified, CGST 9% + SGST 9% applies (Intra-state).
 * If the customer state is any other state, IGST 18% applies (Inter-state).
 */
export function calculateGSTBreakdown(taxableAmountPaisa: number, customerStateCode?: string | null) {
  const isInterState = customerStateCode && customerStateCode !== SUPPLIER_STATE_CODE

  if (isInterState) {
    const igstRate = 18.0
    const igstAmount = Math.round(taxableAmountPaisa * 0.18)
    return {
      isInterState: true,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate,
      igstAmount,
      totalTaxAmount: igstAmount,
      grandTotal: taxableAmountPaisa + igstAmount,
      stateCode: customerStateCode,
      stateName: INDIAN_GST_STATES[customerStateCode] || 'Inter-State'
    }
  } else {
    const cgstRate = 9.0
    const sgstRate = 9.0
    const totalTax = Math.round(taxableAmountPaisa * 0.18)
    const cgstAmount = Math.round(totalTax / 2)
    const sgstAmount = totalTax - cgstAmount

    return {
      isInterState: false,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate: 0,
      igstAmount: 0,
      totalTaxAmount: totalTax,
      grandTotal: taxableAmountPaisa + totalTax,
      stateCode: SUPPLIER_STATE_CODE,
      stateName: SUPPLIER_STATE
    }
  }
}
