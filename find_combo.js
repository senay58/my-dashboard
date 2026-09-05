const fs = require('fs');
const sales = [
  {id: 1,  price: 9700, date: '08-01'},
  {id: 2,  price: 7000, date: '08-04'},
  {id: 3,  price: 9700, date: '08-04'},
  {id: 4,  price: 7000, date: '08-05'},
  {id: 5,  price: 12500, date: '08-05'},
  {id: 6,  price: 12000, date: '08-06'},
  {id: 7,  price: 7000, date: '08-06'},
  {id: 8,  price: 12000, date: '08-06'},
  {id: 9,  price: 12000, date: '08-06'},
  {id: 10, price: 7000, date: '08-06'},
  {id: 11, price: 7000, date: '08-06'},
  {id: 12, price: 9700, date: '08-07'},
  {id: 13, price: 11000, date: '08-07'},
  {id: 14, price: 11500, date: '08-07'},
  {id: 15, price: 9000, date: '08-08'},
  {id: 16, price: 7000, date: '08-08'},
  {id: 17, price: 12000, date: '08-08'},
  {id: 18, price: 12500, date: '08-08'},
  {id: 19, price: 7000, date: '08-08'},
  {id: 20, price: 30000, date: '08-03'},
  {id: 21, price: 12000, date: '08-10'},
  {id: 22, price: 7000, date: '08-10'},
  {id: 23, price: 35000, date: '08-10'},
  {id: 24, price: 9000, date: '08-10'},
  {id: 25, price: 7000, date: '08-11'},
  {id: 26, price: 12000, date: '08-11'},
  {id: 27, price: 7000, date: '08-11'},
  {id: 28, price: 11500, date: '08-11'},
  {id: 29, price: 11000, date: '08-11'},
  {id: 30, price: 11500, date: '08-12'},
  {id: 31, price: 7000, date: '08-12'},
  {id: 32, price: 7000, date: '08-12'},
  {id: 33, price: 7000, date: '08-12'},
  {id: 34, price: 11500, date: '08-13'},
  {id: 35, price: 11500, date: '08-13'},
  {id: 36, price: 11000, date: '08-13'},
  {id: 37, price: 7000, date: '08-13'},
  {id: 38, price: 12500, date: '08-14'},
  {id: 39, price: 12000, date: '08-14'},
  {id: 40, price: 12000, date: '08-14'},
  {id: 41, price: 7000, date: '08-14'},
  {id: 42, price: 11500, date: '08-15'},
  {id: 43, price: 11500, date: '08-17'},
  {id: 44, price: 35000, date: '08-17'},
  {id: 45, price: 35000, date: '08-17'},
  {id: 46, price: 7000, date: '08-01'},
  {id: 47, price: 11500, date: '08-01'},
  {id: 48, price: 7000, date: '08-01'},
  {id: 49, price: 11500, date: '08-01'},
  {id: 50, price: 12500, date: '08-01'},
  {id: 51, price: 7500, date: '08-01'},
  {id: 52, price: 11000, date: '08-01'},
  {id: 53, price: 9700, date: '08-01'},
  {id: 54, price: 7000, date: '08-01'},
  {id: 55, price: 35000, date: '08-03'},
  {id: 56, price: 12500, date: '08-14'},
  {id: 57, price: 7500, date: '08-18'},
  {id: 58, price: 11500, date: '08-18'},
  {id: 59, price: 9200, date: '08-19'},
  {id: 60, price: 12000, date: '08-19'},
  {id: 61, price: 35000, date: '08-19'},
  {id: 62, price: 11500, date: '08-20'},
  {id: 63, price: 12000, date: '08-20'},
  {id: 64, price: 12000, date: '08-20'},
  {id: 65, price: 12000, date: '08-20'},
  {id: 66, price: 7500, date: '08-21'},
  {id: 67, price: 12500, date: '08-22'},
  {id: 68, price: 12500, date: '08-22'},
  {id: 69, price: 7000, date: '08-22'},
  {id: 70, price: 12000, date: '08-22'},
  {id: 71, price: 7000, date: '08-22'},
  {id: 72, price: 7500, date: '08-22'},
  {id: 73, price: 11500, date: '08-24'},
  {id: 74, price: 7500, date: '08-24'},
  {id: 75, price: 12000, date: '08-24'},
  {id: 76, price: 7000, date: '08-24'},
  {id: 77, price: 7000, date: '08-24'},
  {id: 78, price: 7000, date: '08-24'},
  {id: 79, price: 12500, date: '08-25'},
  {id: 80, price: 11000, date: '08-25'},
  {id: 81, price: 11500, date: '08-25'},
  {id: 82, price: 11500, date: '08-25'},
  {id: 83, price: 7500, date: '08-15'},
  {id: 84, price: 7000, date: '08-26'},
  {id: 85, price: 12500, date: '08-28'},
  {id: 86, price: 12000, date: '08-28'},
  {id: 87, price: 11500, date: '08-28'},
  {id: 88, price: 7000, date: '08-28'},
  {id: 89, price: 7000, date: '08-28'},
  {id: 90, price: 7000, date: '08-29'},
  {id: 91, price: 11500, date: '08-29'},
  {id: 92, price: 12000, date: '08-29'},
  {id: 93, price: 7000, date: '08-29'},
  {id: 94, price: 7000, date: '08-31'},
  {id: 95, price: 12500, date: '08-31'},
  {id: 96, price: 7000, date: '08-31'}
];

const target = 50500;
let found = false;

function findCombo(startIndex, currentSum, currentItems) {
  if (found) return;
  if (currentSum === target) {
    console.log('Match Found!', currentItems.map(i => `${i.date}: ${i.price}`).join(' + '));
    found = true;
    return;
  }
  if (currentSum > target || currentItems.length >= 6) return; // limit to 6 items to keep it fast
  
  for (let i = startIndex; i < sales.length; i++) {
    findCombo(i + 1, currentSum + sales[i].price, [...currentItems, sales[i]]);
  }
}
findCombo(0, 0, []);
if (!found) console.log('No combination up to 6 items found.');
