const KEY="bright-path-booked-slots-v1";
function read():Record<string,string[]>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return {}}}
export function getBookedSlots(tutorId:string){return read()[tutorId]||[]}
export function bookSlot(tutorId:string,startsAt:string){const bookings=read();const slots=bookings[tutorId]||[];if(slots.includes(startsAt))return false;bookings[tutorId]=[...slots,startsAt];localStorage.setItem(KEY,JSON.stringify(bookings));return true}
