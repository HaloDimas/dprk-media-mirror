// KCNA Watch source-category IDs for the archive search `source[]` filter,
// grouped for the archive page dropdown. IDs come from KCNA Watch's
// advanced-search form (verified live 15 Nov 2026).

export interface KcnwSourceOption {
  id: string;
  label: string;
}

export interface KcnwSourceGroup {
  group: string;
  options: KcnwSourceOption[];
}

export const KCNW_SOURCE_GROUPS: KcnwSourceGroup[] = [
  {
    group: "KCNA",
    options: [
      { id: "163", label: "KCNA.kp — English" },
      { id: "183982", label: "KCNA.kp — Korean" },
      { id: "190034", label: "KCNA.co.jp — English" },
      { id: "190036", label: "KCNA.co.jp — Korean" },
    ],
  },
  {
    group: "Newspapers",
    options: [
      { id: "156", label: "Rodong Sinmun — English" },
      { id: "189661", label: "Rodong Sinmun — Korean" },
      { id: "2185928", label: "Minju Choson — English" },
      { id: "2180305", label: "Minju Choson — Korean" },
      { id: "183989", label: "Pyongyang Times" },
      { id: "2184294", label: "Chongnyon Chonwi — English" },
      { id: "2166752", label: "Chongnyon Chonwi — Korean" },
      { id: "2182965", label: "Tongil Sinbo" },
    ],
  },
  {
    group: "Broadcasters & portals",
    options: [
      { id: "195116", label: "Naenara — English" },
      { id: "216103", label: "Naenara — Korean" },
      { id: "2166760", label: "Voice of Korea — English" },
      { id: "2166758", label: "Voice of Korea — Korean" },
      { id: "2161004", label: "DPRK Today — English" },
      { id: "197200", label: "DPRK Today — Korean" },
      { id: "203095", label: "Arirang Meari" },
      { id: "209105", label: "Ryugyong" },
      { id: "203097", label: "Ryomyong" },
    ],
  },
  {
    group: "Government & institutions",
    options: [
      { id: "214207", label: "Ministry of Foreign Affairs — English" },
      { id: "2191689", label: "Ministry of Public Health — English" },
      { id: "2191687", label: "Ministry of Public Health — Korean" },
      { id: "2164524", label: "Kim Il Sung University — English" },
      { id: "203101", label: "Kim Il Sung University — Korean" },
      { id: "2166769", label: "KASS — English" },
      { id: "2166766", label: "KASS — Korean" },
      { id: "216118", label: "KFPD — English" },
      { id: "216120", label: "KFPD — Korean" },
      { id: "2191705", label: "Grand National Unity" },
      { id: "216105", label: "Sogwang.com" },
      { id: "216111", label: "Sports DPRK — English" },
      { id: "216114", label: "Sports DPRK — Korean" },
      { id: "209108", label: "Tongil Voice" },
      { id: "175", label: "Uriminzokkiri — English" },
      { id: "189660", label: "Uriminzokkiri — Korean" },
    ],
  },
];
