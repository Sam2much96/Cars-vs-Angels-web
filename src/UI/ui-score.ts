export const uiStore = {
  cash: 10000000,
  health: 100,

  setCash(amount: number) {
    this.cash = amount;
    window.dispatchEvent(new CustomEvent('ui-update', { detail: { cash: amount } }));
  },

  setHealth(amount: number) {
    this.health = amount;
    window.dispatchEvent(new CustomEvent('ui-update', { detail: { health: amount } }));
  },

  getCash(): number{
    return this.cash;
  },

  getHealth(): number{
    return this.health;
  }
};