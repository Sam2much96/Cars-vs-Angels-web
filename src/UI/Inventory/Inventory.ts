/**
 * 
 * Inventory
 * 
 * This is the game's inventory subsystem 
 * 
 * Features / to do:
 * (1) stores weapon and items inventory
 * (2) connects to the react ui to display an inventory and the current active item
 * (3) connects with the Human character to show item use in 3d animation
 */


export class Inventory {
    public items: Record<string, number> = {}; // Dictionary to store inventory items
    public statsUI: HTMLElement | null = null;// to do : connect to react ui
    public cash: number = 10000000;
    public health: number = 100;

    set(itemName: string, quantity: number): void {
     /**
     * Add an item into the inventory.
     * If the quantity is less than or equal to zero, the item is removed.
     * @param itemName - The name of the item.
     * @param quantity - The quantity to add (can be negative for removal).
     */

        if (quantity <= 0) {
            delete this.items[itemName]; // Remove item if quantity is zero or less
        } else {
            this.items[itemName] = (this.items[itemName] || 0) + quantity;
        }
    }


    get(itemName: string): number {
    /**
     * Retrieve the quantity of an item.
     * @param itemName - The name of the item.
     * @returns The quantity of the item, or 0 if it doesn't exist.
     */

        if (typeof itemName !== 'string') {
            throw new Error('Item name must be a string.');
        }
        return this.items[itemName] || 0;
    }

    /**
     * Check if an item exists in the inventory.
     * @param itemName - The name of the item.
     * @returns `true` if the item exists, otherwise `false`.
     */
    has(itemName: string): boolean {
        if (typeof itemName !== 'string') {
            throw new Error('Item name must be a string.');
        }
        return itemName in this.items;
    }

    /**
     * Remove an item completely from the inventory.
     * @param itemName - The name of the item.
     */
    remove(itemName: string): void {
        if (typeof itemName !== 'string') {
            throw new Error('Item name must be a string.');
        }
        delete this.items[itemName];
    }

    /**
     * Get a list of all items in the inventory.
     * @returns A copy of the inventory dictionary.
     */
    getAllItems(): Record<string, number> {
        return { ...this.items };
    }

    /**
     * Count the total number of unique items in the inventory.
     * @returns The number of unique items.
     */
    getItemCount(): number {
        return Object.keys(this.items).length;
    }

    /**
     * Count the total quantity of all items in the inventory.
     * @returns The total quantity of all items.
     */
    getTotalQuantity(): number {
        return Object.values(this.items).reduce((sum, quantity) => sum + quantity, 0);
    }



  setCash(amount: number) {
    this.cash = amount;
    window.dispatchEvent(new CustomEvent('ui-update', { detail: { cash: amount } }));
  }

  setHealth(amount: number) {
    this.health = amount;
    window.dispatchEvent(new CustomEvent('ui-update', { detail: { health: amount } }));
  }

  getCash(): number{
    return this.cash;
  }

  getHealth(): number{
    return this.health;
  }
}