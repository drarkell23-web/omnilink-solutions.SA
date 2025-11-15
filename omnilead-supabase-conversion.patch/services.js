/* services.js
   - Exports global SERVICES array of objects { id, cat, name }
   - This file contains many services across categories to seed the main page.
*/

window.SERVICES = [
  // Property & Maintenance (sample, extendable)
  { id: "s1", cat: "Property & Maintenance", name: "Plumbing - Repairs & Install" },
  { id: "s2", cat: "Property & Maintenance", name: "Roof Repairs" },
  { id: "s3", cat: "Property & Maintenance", name: "Gutter Cleaning & Repair" },
  { id: "s4", cat: "Property & Maintenance", name: "Interior Painting" },
  { id: "s5", cat: "Property & Maintenance", name: "Exterior Painting" },
  { id: "s6", cat: "Property & Maintenance", name: "Tiling & Floor Repair" },
  { id: "s7", cat: "Property & Maintenance", name: "Carpentry & Joinery" },
  { id: "s8", cat: "Property & Maintenance", name: "Locksmith / Door Repairs" },
  { id: "s9", cat: "Property & Maintenance", name: "Waterproofing" },
  { id: "s10", cat: "Property & Maintenance", name: "Geyser / Hot Water Service" },
  { id: "s11", cat: "Property & Maintenance", name: "Electrical Fault Finding" },
  { id: "s12", cat: "Property & Maintenance", name: "Generator Service & Install" },
  { id: "s13", cat: "Property & Maintenance", name: "Fence & Gate Repair" },
  { id: "s14", cat: "Property & Maintenance", name: "Drain & Sewage Unblock" },
  { id: "s15", cat: "Property & Maintenance", name: "Pest Control (Property)" },

  // Cleaning & Hygiene
  { id: "s20", cat: "Cleaning & Hygiene", name: "House Clean - Standard" },
  { id: "s21", cat: "Cleaning & Hygiene", name: "Deep Clean - Home" },
  { id: "s22", cat: "Cleaning & Hygiene", name: "End of Lease Cleaning" },
  { id: "s23", cat: "Cleaning & Hygiene", name: "Carpet Steam Cleaning" },
  { id: "s24", cat: "Cleaning & Hygiene", name: "Office Cleaning (Daily/Weekly)" },
  { id: "s25", cat: "Cleaning & Hygiene", name: "Window Cleaning - Inside/Out" },

  // Security & Energy
  { id: "s30", cat: "Security & Energy", name: "CCTV Install & Service" },
  { id: "s31", cat: "Security & Energy", name: "Alarm System Install" },
  { id: "s32", cat: "Security & Energy", name: "Electric Fence Install / Repair" },
  { id: "s33", cat: "Security & Energy", name: "Solar Panel Installers" },
  { id: "s34", cat: "Security & Energy", name: "Generator Maintenance" },

  // Outdoor & Garden
  { id: "s40", cat: "Outdoor & Garden", name: "Lawn Mowing & Care" },
  { id: "s41", cat: "Outdoor & Garden", name: "Tree Pruning & Felling" },
  { id: "s42", cat: "Outdoor & Garden", name: "Irrigation System Install" },
  { id: "s43", cat: "Outdoor & Garden", name: "Landscape Design" },
  { id: "s44", cat: "Outdoor & Garden", name: "Pool Cleaning & Repair" },

  // Appliances & Repairs
  { id: "s50", cat: "Appliances & Repairs", name: "Fridge Repair" },
  { id: "s51", cat: "Appliances & Repairs", name: "Washing Machine Repair" },
  { id: "s52", cat: "Appliances & Repairs", name: "Oven & Stove Repair" },

  // Electrical & Lighting
  { id: "s60", cat: "Electrical", name: "Light Fitting Install" },
  { id: "s61", cat: "Electrical", name: "Electrician - General" },

  // Plumbing (detailed)
  { id: "s70", cat: "Plumbing", name: "Toilet Install / Replace" },
  { id: "s71", cat: "Plumbing", name: "Tap / Mixer Replacement" },
  { id: "s72", cat: "Plumbing", name: "Burst Pipe Emergency Repair" },

  // Handyman & Odd Jobs
  { id: "s80", cat: "Handyman", name: "Flat Pack Assembly" },
  { id: "s81", cat: "Handyman", name: "Odd Jobs & General Maintenance" },

  // Renovation & Building
  { id: "s90", cat: "Renovation", name: "Bathroom Renovation" },
  { id: "s91", cat: "Renovation", name: "Kitchen Renovation" },

  // Add more filler services so the grid is large (auto-generated)
];

(function extendLargeSet(){
  // produce more sample services to reach 220 total if not present
  const cats = ["Property & Maintenance","Cleaning & Hygiene","Security & Energy","Outdoor & Garden","Appliances & Repairs","Electrical","Plumbing","Handyman","Renovation","IT & Networking","Health & Wellness"];
  const start = window.SERVICES.length + 1;
  for(let i=start;i<=220;i++){
    const cat = cats[i % cats.length];
    window.SERVICES.push({ id: "s" + (1000+i), cat, name: `${cat.split(" ")[0]} Specialist ${i}` });
  }
})();
