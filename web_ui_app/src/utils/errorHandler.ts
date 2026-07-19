/**
 * Error Handler Utilities
 */

export const getErrorMessage = (error: any): string => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  return "An unexpected error occurred. Please try again.";
};

export const getErrorTitle = (error: any): string => {
  if (error?.response?.status === 401) return "Session Expired";
  if (error?.response?.status === 403) return "Access Denied";
  if (error?.response?.status === 404) return "Not Found";
  if (error?.response?.status >= 500) return "Server Error";
  return "Error";
};

export const getBookingErrorMessage = (error: any): string => {
  const msg = getErrorMessage(error);
  if (msg.toLowerCase().includes("slot"))
    return "This time slot is no longer available. Please choose another slot.";
  if (msg.toLowerCase().includes("conflict"))
    return "You already have an appointment at this time. Please select a different slot.";
  return msg;
};
