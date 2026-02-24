/**
 * 
 * 
 * simplistic Inventory system used by react UI
 * 
 * features:
 * (1) can get the amount of cash in db
 * (2) can update the cash amount in db
 * (3) can get the amount of health in db
 * (4) can update the amount of health in db
 * 
 */

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