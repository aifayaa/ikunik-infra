export default async (selectionId) => {
  try {
    const selection = await import(`../res/selection_${selectionId}.json`);
    return selection.default;
  } catch (e){
    return null;
  }
}
