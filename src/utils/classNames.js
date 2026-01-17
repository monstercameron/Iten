/**
 * @fileoverview Utility function for conditional CSS class composition
 * @module utils/classNames
 */

/**
 * Combines multiple class name values into a single space-separated string.
 * Filters out falsy values (null, undefined, false, empty string).
 * 
 * @pure
 * @param {...(string|boolean|null|undefined)} classNameValues - Class names or falsy values
 * @returns {string} Space-separated string of truthy class names
 * 
 * @example
 * classNames('btn', 'btn-primary')           // 'btn btn-primary'
 * classNames('btn', isActive && 'active')    // 'btn active' (if isActive is true)
 * classNames('btn', null, undefined, false)  // 'btn'
 */
export function classNames(...classNameValues) {
  return classNameValues.filter(Boolean).join(' ');
}
