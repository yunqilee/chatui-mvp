export const isMarkdown = (text: string) =>
  /[`*_#>$begin:math:display$$end:math:display$()]/.test(text);
