export function titleCaseWord(word: string) {
  if (!word) return word;
  return word[0].toUpperCase() + word.substr(1).toLowerCase();
}

export function titleCaseName(name: string) {
  return name
    .split(' ')
    .map(titleCaseWord)
    .join(' ');
}