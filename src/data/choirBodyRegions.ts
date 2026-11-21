import type { BodyRegionId } from '@/types/serosafe';

export type BodyMapView = 'front' | 'back' | 'head';

export interface ChoirSegment {
  id: string;
  view: BodyMapView;
  parentRegion: BodyRegionId;
  labelHu: string;
  labelEn: string;
  pathD: string;
}

/**
 * Stanford CHOIR Body Map (CHOIRBM) ihletésű, egymásba nem csúszó SVG anatómiai szegmensek
 * elölnézettel, hátulnézettel és külön nagyított Fej / Arc / Száj / Torok nézettel.
 */
export const CHOIR_SEGMENTS: ChoirSegment[] = [
  // =========================================================================
  // ANTERIOR (ELÖLNÉZET) — viewBox 0 0 280 460
  // =========================================================================
  {
    id: 'f_head_upper',
    view: 'front',
    parentRegion: 'head',
    labelHu: 'Fejtető és homlok',
    labelEn: 'Crown & forehead',
    pathD: 'M116 44 C116 20 164 20 164 44 L164 56 L116 56 Z',
  },
  {
    id: 'f_face_mouth',
    view: 'front',
    parentRegion: 'mouth',
    labelHu: 'Arc, száj és állkapocs',
    labelEn: 'Face, mouth & jaw',
    pathD: 'M116 56 L164 56 L160 72 C154 83 126 83 120 72 Z',
  },
  {
    id: 'f_neck_throat',
    view: 'front',
    parentRegion: 'throat',
    labelHu: 'Nyak és torok',
    labelEn: 'Neck & throat',
    pathD: 'M124 81 Q140 86 156 81 L158 106 Q140 112 122 106 Z',
  },
  {
    id: 'f_shoulder_l',
    view: 'front',
    parentRegion: 'arms',
    labelHu: 'Bal váll',
    labelEn: 'Left shoulder',
    pathD: 'M122 106 L96 112 C81 116 74 128 72 142 L94 146 L100 124 Z',
  },
  {
    id: 'f_shoulder_r',
    view: 'front',
    parentRegion: 'arms',
    labelHu: 'Jobb váll',
    labelEn: 'Right shoulder',
    pathD: 'M158 106 L184 112 C199 116 206 128 208 142 L186 146 L180 124 Z',
  },
  {
    id: 'f_chest_l',
    view: 'front',
    parentRegion: 'chest',
    labelHu: 'Mellkas bal oldal',
    labelEn: 'Left chest',
    pathD: 'M122 106 Q131 110 140 109 L140 168 L98 168 L94 146 L100 124 Z',
  },
  {
    id: 'f_chest_r',
    view: 'front',
    parentRegion: 'chest',
    labelHu: 'Mellkas jobb oldal',
    labelEn: 'Right chest',
    pathD: 'M140 109 Q149 110 158 106 L180 124 L186 146 L182 168 L140 168 Z',
  },
  {
    id: 'f_abdomen_upper',
    view: 'front',
    parentRegion: 'stomach',
    labelHu: 'Felső has / gyomorszáj',
    labelEn: 'Upper abdomen',
    pathD: 'M98 168 L182 168 L178 202 L102 202 Z',
  },
  {
    id: 'f_abdomen_lower',
    view: 'front',
    parentRegion: 'stomach',
    labelHu: 'Alsó has',
    labelEn: 'Lower abdomen',
    pathD: 'M102 202 L178 202 L182 232 L98 232 Z',
  },
  {
    id: 'f_pelvis',
    view: 'front',
    parentRegion: 'stomach',
    labelHu: 'Medence / csípő',
    labelEn: 'Pelvis & hips',
    pathD: 'M98 232 L182 232 L186 264 L146 270 L140 256 L134 270 L94 264 Z',
  },
  {
    id: 'f_upper_arm_l',
    view: 'front',
    parentRegion: 'arms',
    labelHu: 'Bal felkar',
    labelEn: 'Left upper arm',
    pathD: 'M72 142 L94 146 L86 202 L62 198 Z',
  },
  {
    id: 'f_upper_arm_r',
    view: 'front',
    parentRegion: 'arms',
    labelHu: 'Jobb felkar',
    labelEn: 'Right upper arm',
    pathD: 'M186 146 L208 142 L218 198 L194 202 Z',
  },
  {
    id: 'f_forearm_l',
    view: 'front',
    parentRegion: 'arms',
    labelHu: 'Bal alkar',
    labelEn: 'Left forearm',
    pathD: 'M62 198 L86 202 L74 252 L52 248 Z',
  },
  {
    id: 'f_forearm_r',
    view: 'front',
    parentRegion: 'arms',
    labelHu: 'Jobb alkar',
    labelEn: 'Right forearm',
    pathD: 'M194 202 L218 198 L228 248 L206 252 Z',
  },
  {
    id: 'f_hand_l',
    view: 'front',
    parentRegion: 'arms',
    labelHu: 'Bal kézfej',
    labelEn: 'Left hand',
    pathD: 'M52 248 L74 252 L72 280 C70 290 50 288 48 276 Z',
  },
  {
    id: 'f_hand_r',
    view: 'front',
    parentRegion: 'arms',
    labelHu: 'Jobb kézfej',
    labelEn: 'Right hand',
    pathD: 'M206 252 L228 248 L232 276 C230 288 210 290 208 280 Z',
  },
  {
    id: 'f_thigh_l',
    view: 'front',
    parentRegion: 'legs',
    labelHu: 'Bal comb',
    labelEn: 'Left thigh',
    pathD: 'M94 264 L134 270 L132 346 L100 346 Z',
  },
  {
    id: 'f_thigh_r',
    view: 'front',
    parentRegion: 'legs',
    labelHu: 'Jobb comb',
    labelEn: 'Right thigh',
    pathD: 'M146 270 L186 264 L180 346 L148 346 Z',
  },
  {
    id: 'f_shin_l',
    view: 'front',
    parentRegion: 'legs',
    labelHu: 'Bal lábszár',
    labelEn: 'Left lower leg',
    pathD: 'M100 346 L132 346 L126 420 L102 420 Z',
  },
  {
    id: 'f_shin_r',
    view: 'front',
    parentRegion: 'legs',
    labelHu: 'Jobb lábszár',
    labelEn: 'Right lower leg',
    pathD: 'M148 346 L180 346 L178 420 L154 420 Z',
  },
  {
    id: 'f_foot_l',
    view: 'front',
    parentRegion: 'legs',
    labelHu: 'Bal lábfej',
    labelEn: 'Left foot',
    pathD: 'M102 420 L126 420 L128 442 C122 448 96 446 96 436 Z',
  },
  {
    id: 'f_foot_r',
    view: 'front',
    parentRegion: 'legs',
    labelHu: 'Jobb lábfej',
    labelEn: 'Right foot',
    pathD: 'M154 420 L178 420 L184 436 C184 446 158 448 152 442 Z',
  },

  // =========================================================================
  // POSTERIOR (HÁTULNÉZET) — viewBox 0 0 280 460
  // =========================================================================
  {
    id: 'b_occiput',
    view: 'back',
    parentRegion: 'head',
    labelHu: 'Tarkó és fej hátsó része',
    labelEn: 'Occiput & back of head',
    pathD: 'M116 44 C116 20 164 20 164 44 L160 76 L120 76 Z',
  },
  {
    id: 'b_neck',
    view: 'back',
    parentRegion: 'throat',
    labelHu: 'Tarkótáj és hátsó nyak',
    labelEn: 'Back of neck',
    pathD: 'M122 76 L158 76 L160 106 L120 106 Z',
  },
  {
    id: 'b_upper_back_l',
    view: 'back',
    parentRegion: 'chest',
    labelHu: 'Bal lapocka',
    labelEn: 'Left shoulder blade',
    pathD: 'M120 106 L140 106 L140 162 L96 162 L86 120 Z',
  },
  {
    id: 'b_upper_back_r',
    view: 'back',
    parentRegion: 'chest',
    labelHu: 'Jobb lapocka',
    labelEn: 'Right shoulder blade',
    pathD: 'M140 106 L160 106 L194 120 L184 162 L140 162 Z',
  },
  {
    id: 'b_mid_back',
    view: 'back',
    parentRegion: 'chest',
    labelHu: 'Hát közepe',
    labelEn: 'Mid back',
    pathD: 'M98 162 L182 162 L178 202 L102 202 Z',
  },
  {
    id: 'b_lower_back',
    view: 'back',
    parentRegion: 'stomach',
    labelHu: 'Derék / ágyék',
    labelEn: 'Lower back',
    pathD: 'M102 202 L178 202 L182 236 L98 236 Z',
  },
  {
    id: 'b_glutes',
    view: 'back',
    parentRegion: 'legs',
    labelHu: 'Farizom',
    labelEn: 'Glutes',
    pathD: 'M98 236 L182 236 L186 272 L144 276 L140 264 L136 276 L94 272 Z',
  },
  {
    id: 'b_upper_arm_l',
    view: 'back',
    parentRegion: 'arms',
    labelHu: 'Bal felkar (hátul)',
    labelEn: 'Left upper arm (back)',
    pathD: 'M86 120 L96 162 L86 202 L62 198 L72 142 Z',
  },
  {
    id: 'b_upper_arm_r',
    view: 'back',
    parentRegion: 'arms',
    labelHu: 'Jobb felkar (hátul)',
    labelEn: 'Right upper arm (back)',
    pathD: 'M194 120 L208 142 L218 198 L194 202 L184 162 Z',
  },
  {
    id: 'b_forearm_l',
    view: 'back',
    parentRegion: 'arms',
    labelHu: 'Bal alkar és kéz (hátul)',
    labelEn: 'Left forearm & hand',
    pathD: 'M62 198 L86 202 L72 280 C66 290 50 286 50 274 Z',
  },
  {
    id: 'b_forearm_r',
    view: 'back',
    parentRegion: 'arms',
    labelHu: 'Jobb alkar és kéz (hátul)',
    labelEn: 'Right forearm & hand',
    pathD: 'M194 202 L218 198 L230 274 C230 286 214 290 208 280 Z',
  },
  {
    id: 'b_hamstring_l',
    view: 'back',
    parentRegion: 'legs',
    labelHu: 'Bal comb hátulsó része',
    labelEn: 'Left hamstring',
    pathD: 'M94 272 L136 276 L132 348 L100 348 Z',
  },
  {
    id: 'b_hamstring_r',
    view: 'back',
    parentRegion: 'legs',
    labelHu: 'Jobb comb hátulsó része',
    labelEn: 'Right hamstring',
    pathD: 'M144 276 L186 272 L180 348 L148 348 Z',
  },
  {
    id: 'b_calf_l',
    view: 'back',
    parentRegion: 'legs',
    labelHu: 'Bal vádli',
    labelEn: 'Left calf',
    pathD: 'M100 348 L132 348 L126 420 L102 420 Z',
  },
  {
    id: 'b_calf_r',
    view: 'back',
    parentRegion: 'legs',
    labelHu: 'Jobb vádli',
    labelEn: 'Right calf',
    pathD: 'M148 348 L180 348 L178 420 L154 420 Z',
  },
  {
    id: 'b_heel_l',
    view: 'back',
    parentRegion: 'legs',
    labelHu: 'Bal sarok',
    labelEn: 'Left heel',
    pathD: 'M102 420 L126 420 L124 444 L100 444 Z',
  },
  {
    id: 'b_heel_r',
    view: 'back',
    parentRegion: 'legs',
    labelHu: 'Jobb sarok',
    labelEn: 'Right heel',
    pathD: 'M154 420 L178 420 L180 444 L156 444 Z',
  },

  // =========================================================================
  // DETAILED HEAD, MOUTH & THROAT ZOOM — viewBox 0 0 320 340
  // =========================================================================
  {
    id: 'h_crown',
    view: 'head',
    parentRegion: 'head',
    labelHu: 'Fejtető',
    labelEn: 'Crown of head',
    pathD: 'M94 64 C104 20 216 20 226 64 Z',
  },
  {
    id: 'h_forehead',
    view: 'head',
    parentRegion: 'head',
    labelHu: 'Homlok',
    labelEn: 'Forehead',
    pathD: 'M94 64 L226 64 L224 102 L96 102 Z',
  },
  {
    id: 'h_temple_l',
    view: 'head',
    parentRegion: 'head',
    labelHu: 'Bal halánték',
    labelEn: 'Left temple',
    pathD: 'M84 82 L96 102 L98 148 L84 148 C80 124 80 102 84 82 Z',
  },
  {
    id: 'h_temple_r',
    view: 'head',
    parentRegion: 'head',
    labelHu: 'Jobb halánték',
    labelEn: 'Right temple',
    pathD: 'M236 82 C240 102 240 124 236 148 L222 148 L224 102 Z',
  },
  {
    id: 'h_ear_l',
    view: 'head',
    parentRegion: 'head',
    labelHu: 'Bal fül',
    labelEn: 'Left ear',
    pathD: 'M84 114 C68 112 64 134 70 154 C74 166 84 164 86 152 Z',
  },
  {
    id: 'h_ear_r',
    view: 'head',
    parentRegion: 'head',
    labelHu: 'Jobb fül',
    labelEn: 'Right ear',
    pathD: 'M236 114 L234 152 C236 164 246 166 250 154 C256 134 252 112 236 114 Z',
  },
  {
    id: 'h_eyes',
    view: 'head',
    parentRegion: 'head',
    labelHu: 'Szemek és orrnyereg',
    labelEn: 'Eyes & brow',
    pathD: 'M96 102 L224 102 L222 148 L98 148 Z',
  },
  {
    id: 'h_jaw',
    view: 'head',
    parentRegion: 'mouth',
    labelHu: 'Arc, állkapocs és áll',
    labelEn: 'Cheeks, jaw & chin',
    pathD:
      'M98 148 L222 148 L226 172 C222 210 194 230 160 232 C126 230 98 210 94 172 Z M126 162 C122 179 134 196 160 196 C186 196 198 179 194 162 Z',
  },
  {
    id: 'h_mouth',
    view: 'head',
    parentRegion: 'mouth',
    labelHu: 'Száj, ajkak és nyelv',
    labelEn: 'Mouth, lips & tongue',
    pathD: 'M126 162 L194 162 C198 179 186 196 160 196 C134 196 122 179 126 162 Z',
  },
  {
    id: 'h_throat',
    view: 'head',
    parentRegion: 'throat',
    labelHu: 'Torok és gége (elöl)',
    labelEn: 'Throat & larynx (front)',
    pathD: 'M134 230 Q160 234 186 230 L188 310 Q160 318 132 310 Z',
  },
  {
    id: 'h_neck_sides',
    view: 'head',
    parentRegion: 'throat',
    labelHu: 'Nyak oldalsó izmai',
    labelEn: 'Side neck & collar',
    pathD:
      'M118 220 L134 230 L132 310 L76 318 C82 290 110 276 118 248 Z M202 220 L202 248 C210 276 238 290 244 318 L188 310 L186 230 Z',
  },
];

/**
 * Szigorúan csak a valóban kijelölt CHOIR testrészek (+ opcionális szisztémás 'skin')
 * által érintett régiókat adja vissza. Üres kijelölésnél üres tömböt ad, így nem jelenik meg
 * oda nem illő testtájhoz tartozó érzés.
 */
export function getSelectedBodyRegions(
  selectedBodyPartIds: string[],
  hasSkin: boolean,
): BodyRegionId[] {
  const regions = new Set<BodyRegionId>();
  for (const pid of selectedBodyPartIds) {
    const seg = CHOIR_SEGMENTS.find((s) => s.id === pid);
    if (seg) regions.add(seg.parentRegion);
  }
  if (hasSkin) regions.add('skin');
  return Array.from(regions);
}
