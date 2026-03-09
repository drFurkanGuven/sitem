/**
 * Sened-Visualizer — Hadis Isnad (Ravi Zinciri) Veritabanı
 * Kaynak referanslar: Mendeley MIDS Dataset (gzprcr93zn/2), Kutub-i Sitte
 */
(function () {
  'use strict';

  /* ── Tabaka (Katman) Bilgileri ── */
  var TABAKA_INFO = {
    nabi:              { label: 'Neb\u00ee \uFDFA',       color: '#C9A84C', order: 0 },
    sahabe:            { label: 'Sah\u00e2be',            color: '#4A90D9', order: 1 },
    tabiin:            { label: 'T\u00e2bi\u00een',       color: '#3AAFA9', order: 2 },
    tebe_tabiin:       { label: "Tebe-i T\u00e2bi\u00een", color: '#8A6AAC', order: 3 },
    etba_tebe_tabiin:  { label: "Etb\u00e2u't-T\u00e2bi\u00een", color: '#C4864A', order: 4 },
    musannif:          { label: 'Musannif (Derleyici)',    color: '#B85A5A', order: 5 }
  };

  /* ── MADAR rengi (f\u0131st\u0131k ye\u015fili) ── */
  var MADAR_COLOR = '#93C572';

  /* ═══════════════════════════════════════════════
     Hadis Isnad Veritaban\u0131
     ═══════════════════════════════════════════════ */
  var ISNAD_DB = {

    /* ────────────────────────────────────────────
       1. Ameller Niyetlere G\u00f6redir  (Buh\u00e2r\u00ee 1)
       ──────────────────────────────────────────── */
    niyyet: {
      id: 'niyyet',
      title: 'Ameller Niyetlere G\u00f6redir',
      arabicTitle: '\u0625\u0650\u0646\u0651\u064e\u0645\u064e\u0627 \u0627\u0644\u0623\u0639\u0652\u0645\u064e\u0627\u0644\u064f \u0628\u0627\u0644\u0646\u0651\u0650\u064a\u0651\u064e\u0627\u062a\u0650',
      description: 'Bu hadis \u0130slam ilimlerinin temel ta\u015f\u0131d\u0131r. Gar\u00eeb hadis olarak me\u015fhurdur \u2014 Sah\u00e2be tabakasında yaln\u0131zca Hz. \u00d6mer rivâyet etmi\u015ftir. T\u00fcm tarikler Yahya b. Sa\u00eed el-Ens\u00e2r\u00ee\'de birle\u015fir (Med\u00e2r).',
      books: ['Buh\u00e2r\u00ee 1', 'Buh\u00e2r\u00ee 54', 'M\u00fcslim 1907', 'Eb\u00fb D\u00e2v\u00fbd 2201', 'Tirmiz\u00ee 1647', 'Nes\u00e2\u00ee 75'],
      tree: {
        id: 'rasulullah', name: 'Ras\u00fblullah \uFDFA',
        fullName: 'Hz. Muhammed Mustaf\u00e2 \uFDFA',
        tabaka: 'nabi',
        bio: 'Son Peygamber. Hadislerin birincil kayna\u011f\u0131.',
        children: [{
          id: 'omar', name: 'Hz. \u00d6mer (ra)',
          fullName: '\u00d6mer b. el-Hatt\u00e2b el-Kure\u015f\u00ee',
          tabaka: 'sahabe', vefat: 'H. 23 / M. 644',
          bio: '\u0130kinci R\u00e2\u015fid Hal\u00eefe. Peygamber Efendimizin en yak\u0131n sah\u00e2belerinden.',
          cerhTadil: 'Sah\u00e2b\u00ee \u2014 Ud\u00fbl (G\u00fcvenilir). \u0130cm\u00e2 ile.',
          children: [{
            id: 'alkame', name: 'Alkame b. Vakk\u00e2s',
            fullName: 'Alkame b. Vakk\u00e2s el-Leys\u00ee',
            tabaka: 'tabiin',
            bio: 'Med\u00eene\'li T\u00e2bi\u00een \u00e2limi. Hz. \u00d6mer ve di\u011fer sah\u00e2belerden hadis riv\u00e2yet etti.',
            cerhTadil: 'Sika (G\u00fcvenilir) \u2014 \u0130bn Hibb\u00e2n, el-\u0130cl\u00ee',
            children: [{
              id: 'muhammed_ibrahim', name: 'M. b. \u0130br\u00e2h\u00eem et-Teym\u00ee',
              fullName: 'Muhammed b. \u0130br\u00e2h\u00eem b. el-H\u00e2ris et-Teym\u00ee',
              tabaka: 'tabiin', vefat: 'H. 120 / M. 738',
              bio: 'Med\u00eene m\u00fcft\u00fcs\u00fc ve kad\u0131s\u0131. T\u00e2bi\u00een\'in b\u00fcy\u00fck \u00e2limlerinden.',
              cerhTadil: 'Sika \u2014 \u0130ttifak ile. \u0130bn Ma\u00een, Eb\u00fb H\u00e2tim taraf\u0131ndan g\u00fcvenilir bulunmu\u015ftur.',
              children: [{
                id: 'yahya_said', name: 'Yahya b. Sa\u00eed',
                fullName: 'Yahya b. Sa\u00eed el-Ens\u00e2r\u00ee',
                tabaka: 'tabiin', vefat: 'H. 143 / M. 760',
                bio: 'Med\u00eene kad\u0131s\u0131. Bu hadisin MED\u00c2R\'\u0131 \u2014 t\u00fcm tarikler onda birle\u015fir.',
                cerhTadil: 'Sika Sebt \u2014 \u0130mam Ahmed, \u0130bn Ma\u00een. "Med\u00eene\'nin en sa\u011flam r\u00e2v\u00eesi."',
                isMadar: true,
                children: [
                  /* ── Tarik 1: M\u00e2lik \u2192 Buh\u00e2r\u00ee ── */
                  {
                    id: 'malik', name: 'M\u00e2lik b. Enes',
                    fullName: 'M\u00e2lik b. Enes b. M\u00e2lik el-Asbah\u00ee',
                    tabaka: 'tebe_tabiin', vefat: 'H. 179 / M. 795',
                    bio: 'M\u00e2lik\u00ee mezhebinin kurucusu. el-Muvatta\u02be m\u00fcellifi.',
                    cerhTadil: 'H\u00fccet, \u0130m\u00e2mu D\u00e2ri\'l-Hicre \u2014 \u0130cm\u00e2 ile g\u00fcvenilir.',
                    children: [{
                      id: 'abdullah_mesleme', name: 'Abdullah b. Mesleme',
                      fullName: 'Abdullah b. Mesleme el-Ka\'neb\u00ee',
                      tabaka: 'etba_tebe_tabiin', vefat: 'H. 221',
                      bio: 'M\u00e2lik\'in en g\u00fcvenilir talebelerinden.',
                      cerhTadil: 'Sika \u2014 Eb\u00fb H\u00e2tim, en-Nes\u00e2\u00ee',
                      children: [{
                        id: 'buhari_1', name: '\u0130mam Buh\u00e2r\u00ee',
                        fullName: 'Muhammed b. \u0130sm\u00e2\u00eel el-Buh\u00e2r\u00ee',
                        tabaka: 'musannif', vefat: 'H. 256 / M. 870',
                        bio: 'el-C\u00e2mi\u02bfu\'s-Sah\u00eeh m\u00fcellifi.',
                        cerhTadil: 'Em\u00eeru\'l-Mu\'min\u00een fi\'l-Had\u00ees'
                      }]
                    }]
                  },
                  /* ── Tarik 2: S\u00fcfy\u00e2n es-Sevr\u00ee \u2192 M\u00fcslim ── */
                  {
                    id: 'sufyan_sevri', name: 'S\u00fcfy\u00e2n es-Sevr\u00ee',
                    fullName: 'S\u00fcfy\u00e2n b. Sa\u00eed b. Mesr\u00fbk es-Sevr\u00ee',
                    tabaka: 'tebe_tabiin', vefat: 'H. 161 / M. 778',
                    bio: 'K\u00fbfe\'nin b\u00fcy\u00fck imam\u0131. Hadis h\u00e2f\u0131zlar\u0131n\u0131n \u00f6nderi.',
                    cerhTadil: 'Em\u00eeru\'l-Mu\'min\u00een fi\'l-Had\u00ees \u2014 \u0130mam Ahmed.',
                    children: [{
                      id: 'abdur_razzak', name: 'Abd\u00fcrrezz\u00e2k',
                      fullName: 'Abd\u00fcrrezz\u00e2k b. Hemm\u00e2m es-San\'\u00e2n\u00ee',
                      tabaka: 'etba_tebe_tabiin', vefat: 'H. 211',
                      bio: 'Yemen\'in b\u00fcy\u00fck muhaddisi. el-Musannef m\u00fcellifi.',
                      cerhTadil: 'Sika \u2014 \u0130bn Ma\u00een, \u0130mam Ahmed',
                      children: [{
                        id: 'muslim_1', name: '\u0130mam M\u00fcslim',
                        fullName: 'M\u00fcslim b. el-Hacc\u00e2c en-N\u00ees\u00e2b\u00fbr\u00ee',
                        tabaka: 'musannif', vefat: 'H. 261 / M. 875',
                        bio: 'Sah\u00eeh-i M\u00fcslim m\u00fcellifi.',
                        cerhTadil: 'H\u00e2f\u0131z, H\u00fccet'
                      }]
                    }]
                  },
                  /* ── Tarik 3: S\u00fcfy\u00e2n b. Uyeyne \u2192 Buh\u00e2r\u00ee ── */
                  {
                    id: 'sufyan_uyeyne', name: 'S\u00fcfy\u00e2n b. Uyeyne',
                    fullName: 'S\u00fcfy\u00e2n b. Uyeyne b. Meym\u00fbn el-Hil\u00e2l\u00ee',
                    tabaka: 'tebe_tabiin', vefat: 'H. 198 / M. 814',
                    bio: 'Mekke\'nin b\u00fcy\u00fck muhaddisi. 70 y\u0131l hadis riv\u00e2yet etti.',
                    cerhTadil: 'Sika H\u00e2f\u0131z, H\u00fccet \u2014 \u0130mam \u015e\u00e2fi\u00ee.',
                    children: [{
                      id: 'humeydi', name: 'el-Humeyd\u00ee',
                      fullName: 'Abdullah b. ez-Z\u00fcbeyr el-Humeyd\u00ee',
                      tabaka: 'etba_tebe_tabiin', vefat: 'H. 219',
                      bio: '\u0130mam \u015e\u00e2fi\u00ee\'nin talebesi, Mekke muhaddisi.',
                      cerhTadil: 'Sika \u2014 \u0130mam Ahmed, \u0130bn Ma\u00een',
                      children: [{
                        id: 'buhari_2', name: '\u0130mam Buh\u00e2r\u00ee',
                        fullName: 'Muhammed b. \u0130sm\u00e2\u00eel el-Buh\u00e2r\u00ee',
                        tabaka: 'musannif', vefat: 'H. 256 / M. 870',
                        bio: 'el-C\u00e2mi\u02bfu\'s-Sah\u00eeh m\u00fcellifi.',
                        cerhTadil: 'Em\u00eeru\'l-Mu\'min\u00een fi\'l-Had\u00ees'
                      }]
                    }]
                  },
                  /* ── Tarik 4: Hamm\u00e2d b. Zeyd \u2192 Eb\u00fb D\u00e2vud ── */
                  {
                    id: 'hammad_zeyd', name: 'Hamm\u00e2d b. Zeyd',
                    fullName: 'Hamm\u00e2d b. Zeyd b. Dirhem el-Ezd\u00ee',
                    tabaka: 'tebe_tabiin', vefat: 'H. 179 / M. 795',
                    bio: 'Basra\'n\u0131n b\u00fcy\u00fck muhaddisi ve fakihi.',
                    cerhTadil: 'Sika Sebt \u2014 \u0130mam Ahmed: "Basra\'n\u0131n en sa\u011flam r\u00e2v\u00eesi."',
                    children: [{
                      id: 'ismail_ibrahim', name: '\u0130sm\u00e2\u00eel b. \u0130br\u00e2h\u00eem',
                      fullName: '\u0130sm\u00e2\u00eel b. \u0130br\u00e2h\u00eem (\u0130bn Uleyye)',
                      tabaka: 'etba_tebe_tabiin', vefat: 'H. 193',
                      bio: 'Basra\'l\u0131 muhaddis. "\u0130bn Uleyye" lakab\u0131yla tan\u0131n\u0131r.',
                      cerhTadil: 'Sika Sebt \u2014 \u0130bn Ma\u00een',
                      children: [{
                        id: 'ebu_davud_1', name: 'Eb\u00fb D\u00e2vud',
                        fullName: 'Eb\u00fb D\u00e2vud S\u00fcleym\u00e2n b. el-E\u015f\'\u00e2s',
                        tabaka: 'musannif', vefat: 'H. 275 / M. 889',
                        bio: 'S\u00fcnen-i Eb\u00fb D\u00e2vud m\u00fcellifi.',
                        cerhTadil: 'H\u00e2f\u0131z, H\u00fccet'
                      }]
                    }]
                  },
                  /* ── Tarik 5: el-Leys b. Sa\'d \u2192 Tirmiz\u00ee / Nes\u00e2\u00ee ── */
                  {
                    id: 'leys', name: 'el-Leys b. Sa\'d',
                    fullName: 'el-Leys b. Sa\'d b. Abdirrahm\u00e2n el-Fehm\u00ee',
                    tabaka: 'tebe_tabiin', vefat: 'H. 175 / M. 791',
                    bio: 'M\u0131s\u0131r\'in b\u00fcy\u00fck fakihi ve muhaddisi.',
                    cerhTadil: 'Sika Sebt, H\u00fccet \u2014 \u0130mam \u015e\u00e2fi\u00ee, \u0130mam Ahmed',
                    children: [{
                      id: 'kuteybe', name: 'Kuteybe b. Sa\u00eed',
                      fullName: 'Kuteybe b. Sa\u00eed es-Sekaf\u00ee',
                      tabaka: 'etba_tebe_tabiin', vefat: 'H. 240',
                      bio: 'B\u00fcy\u00fck muhaddis. \u00c7ok say\u0131da ilim merkezini dola\u015fm\u0131\u015ft\u0131r.',
                      cerhTadil: 'Sika \u2014 \u0130bn Ma\u00een, Eb\u00fb H\u00e2tim',
                      children: [
                        {
                          id: 'tirmizi_1', name: '\u0130mam Tirmiz\u00ee',
                          fullName: 'Muhammed b. \u00cees\u00e2 et-Tirmiz\u00ee',
                          tabaka: 'musannif', vefat: 'H. 279 / M. 892',
                          bio: 'el-C\u00e2mi\u02bf (S\u00fcnen-i Tirmiz\u00ee) m\u00fcellifi.',
                          cerhTadil: 'H\u00e2f\u0131z, Sika'
                        },
                        {
                          id: 'nesai_1', name: '\u0130mam Nes\u00e2\u00ee',
                          fullName: 'Ahmed b. \u015euayb en-Nes\u00e2\u00ee',
                          tabaka: 'musannif', vefat: 'H. 303 / M. 915',
                          bio: 'S\u00fcnen-i Nes\u00e2\u00ee m\u00fcellifi.',
                          cerhTadil: 'H\u00e2f\u0131z, H\u00fccet'
                        }
                      ]
                    }]
                  }
                ]
              }]
            }]
          }]
        }]
      }
    },

    /* ────────────────────────────────────────────
       2. Din Nasihattir  (M\u00fcslim 55)
       ──────────────────────────────────────────── */
    din_nasihat: {
      id: 'din_nasihat',
      title: 'Din Nasihattir',
      arabicTitle: '\u0627\u0644\u062f\u0651\u0650\u064a\u0646\u064f \u0627\u0644\u0646\u0651\u064e\u0635\u0650\u064a\u062d\u064e\u0629\u064f',
      description: 'Peygamber Efendimiz \u00fc\u00e7 kere "Din nasihattir" buyurmu\u015ftur. Sah\u00e2be "Kime y\u00e2 Ras\u00fblallah?" deyince "Allah\'a, Kitab\u0131na, Ras\u00fbl\u00fcne, M\u00fcsl\u00fcmanlar\u0131n y\u00f6neticilerine ve geneline" buyurmu\u015ftur.',
      books: ['M\u00fcslim 55', 'Eb\u00fb D\u00e2v\u00fbd 4944', 'Nes\u00e2\u00ee 4197', 'Tirmiz\u00ee 1926'],
      tree: {
        id: 'rasulullah_2', name: 'Ras\u00fblullah \uFDFA',
        fullName: 'Hz. Muhammed Mustaf\u00e2 \uFDFA',
        tabaka: 'nabi',
        bio: 'Son Peygamber. Hadislerin birincil kayna\u011f\u0131.',
        children: [{
          id: 'temim', name: 'Tem\u00eem ed-D\u00e2r\u00ee (ra)',
          fullName: 'Tem\u00eem b. Evs ed-D\u00e2r\u00ee',
          tabaka: 'sahabe', vefat: 'H. 40 / M. 661',
          bio: 'Filistinli sah\u00e2b\u00ee. H\u0131ristiyanken M\u00fcsl\u00fcman olmu\u015ftur. Mescid-i Neb\u00eev\u00ee\'de ilk kand\u0131l yakan ki\u015fi.',
          cerhTadil: 'Sah\u00e2b\u00ee \u2014 Ud\u00fbl',
          children: [
            {
              id: 'suheyl', name: 'S\u00fcheyl b. Eb\u00ee S\u00e2lih',
              fullName: 'S\u00fcheyl b. Eb\u00ee S\u00e2lih Zekv\u00e2n',
              tabaka: 'tabiin',
              bio: 'Med\u00eene\'li T\u00e2bi\u00een muhaddisi.',
              cerhTadil: 'Sad\u00fbk, Hasen\u00fc\'l-Had\u00ees \u2014 \u0130bn Ma\u00een',
              isMadar: true,
              children: [
                {
                  id: 'muaviye_salih', name: 'Mu\u00e2viye b. S\u00e2lih',
                  fullName: 'Mu\u00e2viye b. S\u00e2lih el-Hadram\u00ee',
                  tabaka: 'tebe_tabiin', vefat: 'H. 158',
                  bio: 'Endal\u00fcs kad\u0131s\u0131, \u015eam muhaddisi.',
                  cerhTadil: 'Sad\u00fbk \u2014 \u0130bn Ma\u00een',
                  children: [{
                    id: 'abdullah_vehb', name: 'Abdullah b. Vehb',
                    fullName: 'Abdullah b. Vehb el-M\u0131sr\u00ee',
                    tabaka: 'etba_tebe_tabiin', vefat: 'H. 197',
                    bio: 'M\u0131s\u0131rl\u0131 muhaddis ve fakih.',
                    cerhTadil: 'Sika \u2014 \u0130mam Ahmed',
                    children: [{
                      id: 'muslim_nasihat_1', name: '\u0130mam M\u00fcslim',
                      fullName: 'M\u00fcslim b. el-Hacc\u00e2c',
                      tabaka: 'musannif', vefat: 'H. 261',
                      bio: 'Sah\u00eeh-i M\u00fcslim m\u00fcellifi.',
                      cerhTadil: 'H\u00e2f\u0131z, H\u00fccet'
                    }]
                  }]
                },
                {
                  id: 'davud_hind', name: 'D\u00e2vud b. Eb\u00ee Hind',
                  fullName: 'D\u00e2vud b. Eb\u00ee Hind el-Kuşeyr\u00ee',
                  tabaka: 'tebe_tabiin', vefat: 'H. 140',
                  bio: 'Basra\'l\u0131 muhaddis ve f\u0131k\u0131h\u00e7\u0131.',
                  cerhTadil: 'Sika, Sebt \u2014 \u0130bn Ma\u00een',
                  children: [{
                    id: 'said_mansur', name: 'Sa\u00eed b. Mans\u00fbr',
                    fullName: 'Sa\u00eed b. Mans\u00fbr el-Hor\u00e2s\u00e2n\u00ee',
                    tabaka: 'etba_tebe_tabiin', vefat: 'H. 227',
                    bio: 'Mekke\'li muhaddis. S\u00fcnen m\u00fcellifi.',
                    cerhTadil: 'Sika \u2014 \u0130mam Ahmed',
                    children: [{
                      id: 'muslim_nasihat_2', name: '\u0130mam M\u00fcslim',
                      fullName: 'M\u00fcslim b. el-Hacc\u00e2c',
                      tabaka: 'musannif', vefat: 'H. 261',
                      bio: 'Sah\u00eeh-i M\u00fcslim m\u00fcellifi.',
                      cerhTadil: 'H\u00e2f\u0131z, H\u00fccet'
                    }]
                  }]
                },
                {
                  id: 'amesh', name: 'el-A\'me\u015f',
                  fullName: 'S\u00fcleym\u00e2n b. Mihr\u00e2n el-A\'me\u015f',
                  tabaka: 'tebe_tabiin', vefat: 'H. 148',
                  bio: 'K\u00fbfe\'nin b\u00fcy\u00fck muhaddisi. Hadis h\u0131fz\u0131nda benzersiz.',
                  cerhTadil: 'Sika, H\u00e2f\u0131z \u2014 \u0130cm\u00e2 ile',
                  children: [{
                    id: 'ebu_muaviye', name: 'Eb\u00fb Mu\u00e2viye',
                    fullName: 'Muhammed b. H\u00e2zim ed-Dar\u00eer',
                    tabaka: 'etba_tebe_tabiin', vefat: 'H. 195',
                    bio: 'K\u00fbfe\'li muhaddis. el-A\'me\u015f\'in en sa\u011flam talebesi.',
                    cerhTadil: 'Sika \u2014 \u0130mam Ahmed, \u0130bn Ma\u00een',
                    children: [{
                      id: 'ebu_davud_nasihat', name: 'Eb\u00fb D\u00e2vud',
                      fullName: 'Eb\u00fb D\u00e2vud es-Sicist\u00e2n\u00ee',
                      tabaka: 'musannif', vefat: 'H. 275',
                      bio: 'S\u00fcnen-i Eb\u00fb D\u00e2vud m\u00fcellifi.',
                      cerhTadil: 'H\u00e2f\u0131z, H\u00fccet'
                    }]
                  }]
                }
              ]
            },
            {
              id: 'ibn_sirin', name: 'Muhammed b. S\u00eer\u00een',
              fullName: 'Muhammed b. S\u00eer\u00een el-Basr\u00ee',
              tabaka: 'tabiin', vefat: 'H. 110 / M. 729',
              bio: 'Basra\'n\u0131n b\u00fcy\u00fck T\u00e2bi\u00een \u00e2limi. R\u00fcya tabiri ve hadis ilminde otorite.',
              cerhTadil: 'Sika, Sebt \u2014 \u0130cm\u00e2 ile',
              children: [{
                id: 'eyyub_sahtiyani', name: 'Eyy\u00fbb es-Sahtiy\u00e2n\u00ee',
                fullName: 'Eyy\u00fbb b. Eb\u00ee Tem\u00eeme es-Sahtiy\u00e2n\u00ee',
                tabaka: 'tebe_tabiin', vefat: 'H. 131',
                bio: 'Basra\'l\u0131 muhaddis ve z\u00e2hid.',
                cerhTadil: 'Sika, Sebt, H\u00fccet \u2014 \u0130cm\u00e2 ile',
                children: [{
                  id: 'ismail_uleyye', name: '\u0130sm\u00e2\u00eel b. \u0130br\u00e2h\u00eem',
                  fullName: '\u0130sm\u00e2\u00eel b. \u0130br\u00e2h\u00eem (\u0130bn Uleyye)',
                  tabaka: 'etba_tebe_tabiin', vefat: 'H. 193',
                  bio: 'Basra\'l\u0131 muhaddis.',
                  cerhTadil: 'Sika Sebt \u2014 \u0130bn Ma\u00een',
                  children: [{
                    id: 'nesai_nasihat', name: '\u0130mam Nes\u00e2\u00ee',
                    fullName: 'Ahmed b. \u015euayb en-Nes\u00e2\u00ee',
                    tabaka: 'musannif', vefat: 'H. 303',
                    bio: 'S\u00fcnen-i Nes\u00e2\u00ee m\u00fcellifi.',
                    cerhTadil: 'H\u00e2f\u0131z, H\u00fccet'
                  }]
                }]
              }]
            }
          ]
        }]
      }
    },

    /* ────────────────────────────────────────────
       3. Helal Bellidir Haram Bellidir  (Buh\u00e2r\u00ee 52)
       ──────────────────────────────────────────── */
    helal_haram: {
      id: 'helal_haram',
      title: 'Helal Bellidir, Haram Bellidir',
      arabicTitle: '\u0627\u0644\u0652\u062d\u064e\u0644\u064e\u0627\u0644\u064f \u0628\u064e\u064a\u0651\u0650\u0646\u064c \u0648\u064e\u0627\u0644\u0652\u062d\u064e\u0631\u064e\u0627\u0645\u064f \u0628\u064e\u064a\u0651\u0650\u0646\u064c',
      description: 'Peygamber Efendimiz helal ve haram\u0131n a\u00e7\u0131k oldu\u011funu, arada \u015f\u00fcpheli \u015feylerin bulundu\u011funu bildirmi\u015ftir. Bu hadis \u0130slam hukukunun temel ilkelerinden birini olu\u015fturur.',
      books: ['Buh\u00e2r\u00ee 52', 'M\u00fcslim 1599', 'Eb\u00fb D\u00e2v\u00fbd 3329', 'Tirmiz\u00ee 1205', '\u0130bn M\u00e2ce 3984'],
      tree: {
        id: 'rasulullah_3', name: 'Ras\u00fblullah \uFDFA',
        fullName: 'Hz. Muhammed Mustaf\u00e2 \uFDFA',
        tabaka: 'nabi',
        bio: 'Son Peygamber. Hadislerin birincil kayna\u011f\u0131.',
        children: [{
          id: 'numan', name: 'en-Nu\'m\u00e2n b. Be\u015f\u00eer (ra)',
          fullName: 'en-Nu\'m\u00e2n b. Be\u015f\u00eer b. Sa\'d el-Ens\u00e2r\u00ee',
          tabaka: 'sahabe', vefat: 'H. 65 / M. 684',
          bio: 'K\u00fbfe val\u00eesi. Ens\u00e2r\'dan, Peygamber d\u00f6neminde do\u011fan ilk \u00e7ocuk.',
          cerhTadil: 'Sah\u00e2b\u00ee \u2014 Ud\u00fbl',
          children: [{
            id: 'sabi', name: 'e\u015f-\u015ea\'b\u00ee',
            fullName: '\u00c2mir b. \u015eer\u00e2h\u00eel e\u015f-\u015ea\'b\u00ee',
            tabaka: 'tabiin', vefat: 'H. 104 / M. 722',
            bio: 'K\u00fbfe\'nin b\u00fcy\u00fck T\u00e2bi\u00een \u00e2limi ve kad\u0131s\u0131. 500\'den fazla sah\u00e2b\u00eeyle g\u00f6r\u00fc\u015fm\u00fc\u015ft\u00fcr.',
            cerhTadil: 'Sika, Sebt, Fakih \u2014 \u0130cm\u00e2 ile g\u00fcvenilir.',
            isMadar: true,
            children: [
              {
                id: 'zekeriyya', name: 'Zekeriyy\u00e2 b. Eb\u00ee Z\u00e2ide',
                fullName: 'Zekeriyy\u00e2 b. Eb\u00ee Z\u00e2ide el-Hemd\u00e2n\u00ee',
                tabaka: 'tebe_tabiin', vefat: 'H. 149',
                bio: 'K\u00fbfe\'li muhaddis ve kad\u0131.',
                cerhTadil: 'Sika \u2014 \u0130bn Ma\u00een, en-Nes\u00e2\u00ee',
                children: [{
                  id: 'veki_helal', name: 'Vek\u00ee\' b. el-Cerr\u00e2h',
                  fullName: 'Vek\u00ee\' b. el-Cerr\u00e2h er-Ru\u00e2s\u00ee',
                  tabaka: 'etba_tebe_tabiin', vefat: 'H. 197',
                  bio: 'K\u00fbfe\'nin b\u00fcy\u00fck muhaddisi.',
                  cerhTadil: 'Sika Sebt, H\u00fccet',
                  children: [{
                    id: 'buhari_helal', name: '\u0130mam Buh\u00e2r\u00ee',
                    fullName: 'Muhammed b. \u0130sm\u00e2\u00eel el-Buh\u00e2r\u00ee',
                    tabaka: 'musannif', vefat: 'H. 256',
                    bio: 'el-C\u00e2mi\u02bfu\'s-Sah\u00eeh m\u00fcellifi.',
                    cerhTadil: 'Em\u00eeru\'l-Mu\'min\u00een fi\'l-Had\u00ees'
                  }]
                }]
              },
              {
                id: 'sufyan_helal', name: 'S\u00fcfy\u00e2n es-Sevr\u00ee',
                fullName: 'S\u00fcfy\u00e2n b. Sa\u00eed es-Sevr\u00ee',
                tabaka: 'tebe_tabiin', vefat: 'H. 161',
                bio: 'K\u00fbfe\'nin b\u00fcy\u00fck imam\u0131.',
                cerhTadil: 'Em\u00eeru\'l-Mu\'min\u00een fi\'l-Had\u00ees',
                children: [{
                  id: 'abdurrahman_mehdi', name: 'Abdurrahman b. Mehd\u00ee',
                  fullName: 'Abdurrahman b. Mehd\u00ee el-Basr\u00ee',
                  tabaka: 'etba_tebe_tabiin', vefat: 'H. 198',
                  bio: 'Basra\'n\u0131n b\u00fcy\u00fck muhaddisi ve cerh-ta\'d\u00eel imam\u0131.',
                  cerhTadil: 'Sika Sebt, H\u00fccet \u2014 \u0130mam Ahmed',
                  children: [{
                    id: 'muslim_helal', name: '\u0130mam M\u00fcslim',
                    fullName: 'M\u00fcslim b. el-Hacc\u00e2c',
                    tabaka: 'musannif', vefat: 'H. 261',
                    bio: 'Sah\u00eeh-i M\u00fcslim m\u00fcellifi.',
                    cerhTadil: 'H\u00e2f\u0131z, H\u00fccet'
                  }]
                }]
              },
              {
                id: 'ibn_avn', name: '\u0130bn Avn',
                fullName: 'Abdullah b. Avn el-Basr\u00ee',
                tabaka: 'tebe_tabiin', vefat: 'H. 151',
                bio: 'Basra\'l\u0131 muhaddis ve z\u00e2hid.',
                cerhTadil: 'Sika, Sebt \u2014 \u0130bn Ma\u00een',
                children: [{
                  id: 'muhammed_cafer', name: 'Muhammed b. Ca\'fer',
                  fullName: 'Muhammed b. Ca\'fer el-H\u00fczeyl\u00ee (Gunder)',
                  tabaka: 'etba_tebe_tabiin', vefat: 'H. 193',
                  bio: 'Basra\'l\u0131 muhaddis. \u015eu\'be\'nin en g\u00fcvenilir talebesi.',
                  cerhTadil: 'Sika \u2014 \u0130bn Ma\u00een',
                  children: [{
                    id: 'ibn_mace_helal', name: '\u0130bn M\u00e2ce',
                    fullName: 'Muhammed b. Yez\u00eed \u0130bn M\u00e2ce',
                    tabaka: 'musannif', vefat: 'H. 273',
                    bio: 'S\u00fcnen-i \u0130bn M\u00e2ce m\u00fcellifi.',
                    cerhTadil: 'H\u00e2f\u0131z, Sika'
                  }]
                }]
              }
            ]
          }]
        }]
      }
    }
  };

  /* ═══════════════════════════════════════════════
     Hadis → Sened E\u015fle\u015ftirme Haritas\u0131
     ═══════════════════════════════════════════════ */
  var HADITH_SENED_MAP = {
    /* Niyyet hadisi */
    'tur-bukhari:1':    'niyyet',
    'tur-bukhari:54':   'niyyet',
    'tur-bukhari:2529': 'niyyet',
    'tur-bukhari:5070': 'niyyet',
    'tur-bukhari:6689': 'niyyet',
    'tur-bukhari:6953': 'niyyet',
    'tur-muslim:1907':  'niyyet',
    'tur-abudawud:2201':'niyyet',
    'tur-tirmidhi:1647':'niyyet',
    'tur-nasai:75':     'niyyet',
    /* Din nasihattir */
    'tur-muslim:55':    'din_nasihat',
    'tur-muslim:56':    'din_nasihat',
    'tur-abudawud:4944':'din_nasihat',
    'tur-nasai:4197':   'din_nasihat',
    'tur-tirmidhi:1926':'din_nasihat',
    /* Helal haram */
    'tur-bukhari:52':   'helal_haram',
    'tur-muslim:1599':  'helal_haram',
    'tur-abudawud:3329':'helal_haram',
    'tur-tirmidhi:1205':'helal_haram',
    'tur-ibnmajah:3984':'helal_haram'
  };

  /* Metin tabanl\u0131 e\u015fle\u015ftirme kalıplar\u0131 */
  var TEXT_PATTERNS = {
    'niyyet':      ['ameller ancak niyetlere', 'ameller niyetlere göre'],
    'din_nasihat': ['din nasihattir', 'din nasihat'],
    'helal_haram': ['helal bellidir haram bellidir', 'helâl bellidir harâm bellidir', 'helal belli haram belli']
  };

  /**
   * Verilen hadis için sened veritabanındaki id'yi döndürür.
   * @param {string} bookKey  – Kitap anahtar\u0131 (ör. 'tur-bukhari')
   * @param {number|string} no – Hadis numaras\u0131
   * @param {string} text      – Hadis metni (opsiyonel)
   * @returns {string|null}
   */
  window.getIsnadId = function (bookKey, no, text) {
    var exact = bookKey + ':' + no;
    if (HADITH_SENED_MAP[exact]) return HADITH_SENED_MAP[exact];

    if (text) {
      var norm = text.toLowerCase().replace(/\s+/g, ' ').trim();
      for (var id in TEXT_PATTERNS) {
        var patterns = TEXT_PATTERNS[id];
        for (var i = 0; i < patterns.length; i++) {
          if (norm.indexOf(patterns[i]) !== -1) return id;
        }
      }
    }
    return null;
  };

  window.ISNAD_DB    = ISNAD_DB;
  window.TABAKA_INFO = TABAKA_INFO;
  window.MADAR_COLOR = MADAR_COLOR;
})();
