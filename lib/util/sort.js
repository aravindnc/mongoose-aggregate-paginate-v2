function convertSortStringToObject(str) {
  const sortObject = {};
  str.split(" ").forEach((field) => {
    if (field.startsWith("-")) {
      sortObject[field.substring(1)] = -1;
    } else {
      sortObject[field] = 1;
    }
  });
  return sortObject;
}

function convertSortArrayToObject(arr) {
  const sortObject = {};
  arr.forEach(([field, direction]) => {
    sortObject[field] = direction === "asc" || direction === 1 ? 1 : -1;
  });
  return sortObject;
}

function parseSort(sort) {
  if (typeof sort === "string") {
    return convertSortStringToObject(sort);
  }
  if (Array.isArray(sort)) {
    return convertSortArrayToObject(sort);
  }
  const sortObject = {};
  for (const [field, direction] of Object.entries(sort)) {
    sortObject[field] = direction === "asc" || direction === 1 ? 1 : -1;
  }
  return sortObject;
}

exports.parseSort = parseSort;
