// The draft the runner produces for the anchor action. Claims: s = sourced, c = needs confirmation.
window.DRAFT = {
  h1: "Nike Running Shoe Technology: Pegasus vs. Vomero",
  meta_title: "Nike Running Shoes and Performance Gear Selection Guide",
  meta_description: "Compare Nike Pegasus and Vomero cushioning, learn how to select performance apparel for thermoregulation, and explore digital training support tools.",
  score: 82,
  claims: { total: 27, sourced: 24, confirm: 3 },
  sections: [
    {
      h2: "Running shoe technology and selection",
      chunk: [
        { t: "Nike builds two cushioned daily trainers on different philosophies: the Pegasus 41 pairs ReactX foam with Air Zoom units for a responsive, firmer ride, while the Vomero 18 stacks ZoomX over Cushlon 3.0 for a plush, high-stack feel.", k: "s", src: "about.nike.com — road running footwear lineup" },
        { t: "Independent testers describe the Vomero as significantly softer underfoot than the Pegasus, which favours stability and uptempo daily miles.", k: "s", src: "@TheRunTesters, Vomero 18 vs Pegasus 41 head-to-head" },
        { t: "Nike Air units are pressurised gas capsules that attenuate impact; the lineage runs from the original Air sole to Air Max to Zoom Air.", k: "s", src: "Foot Doctor Zach — history of Nike Air" }
      ],
      bullets: [
        { t: "Pegasus 41: ReactX midsole, forefoot Air Zoom, stated for daily training and tempo work.", k: "s", src: "ChatGPT fan-out: 'Nike Pegasus 41 ReactX Air Zoom cushioning official Nike'" },
        { t: "Vomero 18: ZoomX + Cushlon 3.0, stated for high-mileage and recovery runs.", k: "s", src: "about.nike.com" },
        { t: "Arch type: the current arch-support classification and recommended usage for the latest Pegasus and Vomero models.", k: "c", src: "Required input — confirm with product team" },
        { t: "Marathon training on pavement: cushioned daily trainers cover the bulk of mileage; carbon-plated racers such as the Alphafly 3 are reserved for race day.", k: "s", src: "irunfar.com — Best Marathon Shoes of 2026" }
      ]
    },
    {
      h2: "Performance apparel and equipment functionality",
      chunk: [
        { t: "Moisture-wicking fabrics move sweat away from the skin so it can evaporate, which supports thermoregulation during high-intensity exercise in the heat.", k: "s", src: "PMC narrative review — sports clothing in thermoregulation" },
        { t: "Synthetic fibres such as polyester wick and dry faster than cotton; natural fibres such as merino manage odour and temperature across a wider range but dry more slowly.", k: "s", src: "icebreaker.com — natural fibres vs synthetics" },
        { t: "Nike Dri-FIT apparel is engineered to move sweat to the fabric surface for faster evaporation.", k: "c", src: "Confirm current Dri-FIT product claim wording" }
      ],
      bullets: [
        { t: "Waterproof windbreakers: look for a sealed-seam shell with a stated hydrostatic-head rating; 'water-resistant' is not 'waterproof'.", k: "s", src: "Industry standard definitions" },
        { t: "Artificial-turf football boots use AG-specific soleplates with shorter, more numerous studs to spread load on 3G/4G surfaces.", k: "s", src: "cleatshub.com — football boots for artificial grass" }
      ]
    },
    {
      h2: "Advanced athletic footwear and training support",
      chunk: [
        { t: "Basketball shoe cushioning in 2026 combines high-rebound foams with impact-protection setups; ankle support comes from structural design elements — heel counters, collar height and lateral containment — rather than height alone.", k: "s", src: "runrepeat.com — 7 Best Basketball Shoes for Ankle Support 2026" },
        { t: "Digital fitness apps provide personalised workout plans that complement equipment choices; the Nike Training Club app offers structured programmes across strength, mobility and running.", k: "c", src: "Confirm current NTC programme names" }
      ],
      bullets: [
        { t: "Cross-training shoes for weightlifting and agility drills prioritise a stable, low-stack heel and lateral support over cushioning.", k: "s", src: "menshealth.com / tomsguide.com cross-training roundups" }
      ]
    }
  ],
  faq: [
    { q: "Which is softer, the Pegasus or the Vomero?", a: "The Vomero. Testers consistently describe it as significantly softer; the Pegasus is the firmer, more responsive of the two.", k: "s" },
    { q: "How does Nike Air provide cushioning?", a: "Pressurised gas units inside the midsole compress on impact and return to shape, attenuating force.", k: "s" },
    { q: "Why is moisture-wicking fabric essential for outdoor exercise?", a: "It moves sweat off the skin so it can evaporate, which is how the body sheds heat during exercise.", k: "s" },
    { q: "Are lightweight windbreakers fully waterproof?", a: "Only if seams are sealed and the fabric carries a waterproof rating; most lightweight windbreakers are water-resistant.", k: "s" }
  ],
  jsonld: '{"@context":"https://schema.org","@graph":[{"@type":"Article","headline":"Nike Running Shoe Technology: Pegasus vs. Vomero","author":{"@type":"Organization","name":"Nike"}},{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Which is softer, the Pegasus or the Vomero?","acceptedAnswer":{"@type":"Answer","text":"The Vomero…"}}]}]}',
  never_write_hits: [{ term: "best", where: "H2 draft 3, bullet 1", fixed: "prioritise" }]
};
