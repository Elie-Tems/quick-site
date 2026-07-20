// Neutral "no image yet" placeholder for storefront hero/product art, used when a
// merchant hasn't uploaded one. Several layouts previously fell back to a random
// Unsplash photo of an unrelated business/product, which reads as a real photo of
// THIS business - a violation of the project's no-fake-data policy (CLAUDE.md).
// This is a plain, honest gradient + icon instead of implying real content.
export const STOREFRONT_IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E" +
  "%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E" +
  "%3Cstop offset='0' stop-color='%23e2e8f0'/%3E%3Cstop offset='1' stop-color='%23cbd5e1'/%3E" +
  "%3C/linearGradient%3E%3C/defs%3E" +
  "%3Crect width='400' height='300' fill='url(%23g)'/%3E" +
  "%3Cg fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linejoin='round' stroke-linecap='round'%3E" +
  "%3Crect x='130' y='105' width='140' height='100' rx='8'/%3E" +
  "%3Ccircle cx='163' cy='135' r='9'/%3E" +
  "%3Cpath d='M130 190l35-35 25 25 25-30 55 40'/%3E" +
  "%3C/g%3E%3C/svg%3E";
