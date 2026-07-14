// SECURITY: xlsx package removed due to unpatched Prototype Pollution + ReDoS.
// All XLSX export is handled server-side by the FastAPI backend.
import { toast } from 'sonner'
import { getBackendUrl } from './url'

function flattenObject(obj: any, prefix: string = '', res: any = {}): any {
  if (obj === null || obj === undefined) return res

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const propName = prefix ? `${prefix}_${key}` : key
      const val = obj[key]

      if (val !== null && typeof val === 'object') {
        if (Array.isArray(val)) {
          if (val.length === 0) {
            res[propName] = ''
          } else if (typeof val[0] !== 'object') {
            res[propName] = val.join(', ')
          } else {
            // Array of objects (nested table) - save as JSON string fallback
            res[propName] = JSON.stringify(val)
          }
        } else {
          // Nested object
          flattenObject(val, propName, res)
        }
      } else {
        res[propName] = val
      }
    }
  }
  return res
}

export function canBeTabular(data: any): boolean {
  if (data === null || data === undefined) return true;

  // Helper to check if a value is hierarchical (nested object or array of objects)
  const isHierarchical = (val: any): boolean => {
    if (val !== null && typeof val === 'object') {
      if (Array.isArray(val)) {
        // If it's an array, check if it contains any objects or arrays
        return val.some(item => item !== null && typeof item === 'object');
      }
      // If it's a non-null object, it's hierarchical
      return true;
    }
    return false;
  };

  if (Array.isArray(data)) {
    // If it's an array, check if each item contains nested objects or nested arrays of objects
    for (const item of data) {
      if (item !== null && typeof item === 'object') {
        for (const key in item) {
          if (Object.prototype.hasOwnProperty.call(item, key)) {
            if (isHierarchical(item[key])) {
              return false;
            }
          }
        }
      }
    }
    return true;
  }

  if (typeof data === 'object') {
    // Check if it's a single object, we can allow at most one nested array (like line_items)
    // and that array itself must not contain hierarchical items.
    let hasNestedArray = false;
    let nestedArrayKey = '';

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const val = data[key];
        if (val !== null && typeof val === 'object') {
          if (Array.isArray(val)) {
            if (hasNestedArray) {
              // Multiple nested arrays - cannot be cleanly represented in a single sheet
              return false;
            }
            hasNestedArray = true;
            nestedArrayKey = key;
          } else {
            // Nested object - cannot be cleanly represented
            return false;
          }
        }
      }
    }

    if (hasNestedArray) {
      const arr = data[nestedArrayKey];
      for (const item of arr) {
        if (item !== null && typeof item === 'object') {
          for (const key in item) {
            if (Object.prototype.hasOwnProperty.call(item, key)) {
              if (isHierarchical(item[key])) {
                return false;
              }
            }
          }
        }
      }
    }
    return true;
  }

  return true;
}

export async function downloadExport(
  data: any, 
  format: string,
  referenceFile?: File | null, 
  filename?: string
) {
  const baseFilename = filename ? filename.replace(/\.[^/.]+$/, "") : 'triscrap_export';
  const downloadFilename = `${baseFilename}.${format.toLowerCase()}`;

  const backendBaseUrl = getBackendUrl();
  const exportUrl = `${backendBaseUrl}/api/export?format=${format.toLowerCase()}`;

  try {
    const formData = new FormData();
    if (referenceFile) {
      formData.append('reference_file', referenceFile);
    }
    formData.append('data', JSON.stringify(data));

    const response = await fetch(exportUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown backend error");
      throw new Error(`FastAPI Export Failed (HTTP ${response.status}): ${errorText}`);
    }

    const result = await response.json();
    if (result.status === 'success' && result.file) {
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((warn: string) => {
          toast.warning(warn, { duration: 8000 });
        });
      }

      const binaryString = window.atob(result.file);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: result.content_type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename || downloadFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      throw new Error(result.message || "Failed to receive valid conversion file.");
    }
  } catch (error: any) {
    console.error("Universal conversion request failed:", error);
    toast.error(`Conversion failed: ${error.message || error}`);
    throw error;
  }
}
