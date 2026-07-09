export const getCoverImage = (images: any[]) => {
  return images.find((img) => img.type === 'hero' || img.type === 'featured') || null;
};
