import React from 'react';
import {
  LuUtensils,
  LuCoffee,
  LuPizza,
  LuShoppingBag,
  LuShoppingCart,
  LuShirt,
  LuPlane,
  LuCar,
  LuFuel,
  LuZap,
  LuDroplets,
  LuWifi,
  LuFilm,
  LuGamepad2,
  LuMusic,
  LuTicket,
  LuHeartPulse,
  LuDumbbell,
  LuPill,
  LuStethoscope,
  LuTrendingUp,
  LuWallet,
  LuGraduationCap,
  LuUsers,
  LuSparkles,
  LuCircleDollarSign,
} from 'react-icons/lu';

import {
  SiNetflix,
  SiSpotify,
  SiStarbucks,
  SiZomato,
  SiSwiggy,
  SiUber,
  SiApple,
  SiGoogle,
  SiNike,
  SiAdidas,
  SiAirbnb,
  SiSteam,
  SiPlaystation,
  SiGithub,
  SiPaypal,
  SiStripe,
  SiYoutube,
  SiTwitch,
  SiNotion,
  SiFigma,
  SiIkea,
  SiEbay,
  SiDropbox,
} from 'react-icons/si';

import {
  FaBurger,
  FaBowlFood,
  FaCreditCard,
  FaBuildingColumns,
  FaHotel,
  FaAmazon,
  FaXbox,
  FaPaintbrush,
  FaTrainSubway,
  FaHouse,
} from 'react-icons/fa6';

export interface MatchedIconResult {
  type: 'brand' | 'category' | 'generic';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  domain?: string;
  bgTone: string;
  badgeBg: string;
  badgeBorder: string;
  badgeColor: string;
}

// Brand directory with web domains and React Icons
const BRAND_DIRECTORY: {
  keywords: string[];
  domain: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badgeBg: string;
  badgeBorder: string;
  badgeColor: string;
}[] = [
  // Food & Coffee
  { keywords: ['zomato'], domain: 'zomato.com', icon: SiZomato, badgeBg: '#FFE4E6', badgeBorder: '#FECDD3', badgeColor: '#E23744' },
  { keywords: ['swiggy', 'instamart'], domain: 'swiggy.com', icon: SiSwiggy, badgeBg: '#FFF7ED', badgeBorder: '#FFEDD5', badgeColor: '#FC8019' },
  { keywords: ['starbucks', 'starbuck'], domain: 'starbucks.com', icon: SiStarbucks, badgeBg: '#ECFDF5', badgeBorder: '#A7F3D0', badgeColor: '#006241' },
  { keywords: ['mcdonald', 'mcdonalds', 'mcd'], domain: 'mcdonalds.com', icon: FaBurger, badgeBg: '#FEF2F2', badgeBorder: '#FECACA', badgeColor: '#DA291C' },
  { keywords: ['domino', 'dominos', 'dominoes'], domain: 'dominos.com', icon: LuPizza, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#006491' },
  { keywords: ['kfc'], domain: 'kfc.com', icon: FaBowlFood, badgeBg: '#FEF2F2', badgeBorder: '#FECACA', badgeColor: '#A3080C' },
  { keywords: ['burger king', 'burgerking'], domain: 'bk.com', icon: FaBurger, badgeBg: '#FFFBEB', badgeBorder: '#FDE68A', badgeColor: '#D62300' },
  { keywords: ['subway'], domain: 'subway.com', icon: LuUtensils, badgeBg: '#F0FDF4', badgeBorder: '#BBF7D0', badgeColor: '#008C15' },
  { keywords: ['dunkin', 'dunkindonuts'], domain: 'dunkindonuts.com', icon: LuCoffee, badgeBg: '#FDF2F8', badgeBorder: '#FBCFE8', badgeColor: '#E11383' },
  { keywords: ['costa coffee', 'costa'], domain: 'costa.co.uk', icon: LuCoffee, badgeBg: '#FEF2F2', badgeBorder: '#FECACA', badgeColor: '#701026' },

  // E-commerce & Retail
  { keywords: ['amazon', 'aws', 'prime'], domain: 'amazon.com', icon: FaAmazon, badgeBg: '#FFFBEB', badgeBorder: '#FDE68A', badgeColor: '#FF9900' },
  { keywords: ['flipkart'], domain: 'flipkart.com', icon: LuShoppingBag, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#2874F0' },
  { keywords: ['myntra'], domain: 'myntra.com', icon: LuShirt, badgeBg: '#FDF2F8', badgeBorder: '#FBCFE8', badgeColor: '#FF3F6C' },
  { keywords: ['nykaa'], domain: 'nykaa.com', icon: LuSparkles, badgeBg: '#FDF2F8', badgeBorder: '#FBCFE8', badgeColor: '#FC2779' },
  { keywords: ['ajio'], domain: 'ajio.com', icon: LuShoppingBag, badgeBg: '#F8FAFC', badgeBorder: '#E2E8F0', badgeColor: '#2C4152' },
  { keywords: ['zara'], domain: 'zara.com', icon: LuShirt, badgeBg: '#F8FAFC', badgeBorder: '#E2E8F0', badgeColor: '#111827' },
  { keywords: ['h&m', 'hm '], domain: 'hm.com', icon: LuShirt, badgeBg: '#FEF2F2', badgeBorder: '#FECACA', badgeColor: '#CC0000' },
  { keywords: ['nike'], domain: 'nike.com', icon: SiNike, badgeBg: '#F1F5F9', badgeBorder: '#CBD5E1', badgeColor: '#111827' },
  { keywords: ['adidas'], domain: 'adidas.com', icon: SiAdidas, badgeBg: '#F1F5F9', badgeBorder: '#CBD5E1', badgeColor: '#111827' },
  { keywords: ['puma'], domain: 'puma.com', icon: LuShirt, badgeBg: '#FEF2F2', badgeBorder: '#FECACA', badgeColor: '#BA0C2F' },
  { keywords: ['decathlon'], domain: 'decathlon.com', icon: LuDumbbell, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#0082C3' },
  { keywords: ['ikea'], domain: 'ikea.com', icon: SiIkea, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#0058A3' },
  { keywords: ['ebay'], domain: 'ebay.com', icon: SiEbay, badgeBg: '#FFFBEB', badgeBorder: '#FDE68A', badgeColor: '#E53238' },

  // Quick Commerce & Grocery
  { keywords: ['blinkit', 'grofers'], domain: 'blinkit.com', icon: LuShoppingCart, badgeBg: '#FFFBEB', badgeBorder: '#FDE68A', badgeColor: '#F4C430' },
  { keywords: ['zepto'], domain: 'zeptonow.com', icon: LuShoppingCart, badgeBg: '#FDF4FF', badgeBorder: '#F5D0FE', badgeColor: '#7C3AED' },
  { keywords: ['bigbasket', 'bbdaily'], domain: 'bigbasket.com', icon: LuShoppingCart, badgeBg: '#F0FDF4', badgeBorder: '#BBF7D0', badgeColor: '#84C225' },

  // Travel & Rides
  { keywords: ['uber'], domain: 'uber.com', icon: SiUber, badgeBg: '#F1F5F9', badgeBorder: '#CBD5E1', badgeColor: '#000000' },
  { keywords: ['ola', 'olacabs'], domain: 'olacabs.com', icon: LuCar, badgeBg: '#FEF9C3', badgeBorder: '#FEF08A', badgeColor: '#B45309' },
  { keywords: ['rapido'], domain: 'rapido.bike', icon: LuCar, badgeBg: '#FEF08A', badgeBorder: '#FDE047', badgeColor: '#CA8A04' },
  { keywords: ['airbnb'], domain: 'airbnb.com', icon: SiAirbnb, badgeBg: '#FFE4E6', badgeBorder: '#FECDD3', badgeColor: '#FF5A5F' },
  { keywords: ['booking.com', 'booking '], domain: 'booking.com', icon: FaHotel, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#003580' },
  { keywords: ['makemytrip', 'mmt'], domain: 'makemytrip.com', icon: LuPlane, badgeBg: '#FEF2F2', badgeBorder: '#FECACA', badgeColor: '#E42529' },
  { keywords: ['goibibo'], domain: 'goibibo.com', icon: LuPlane, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#EC5B24' },
  { keywords: ['irctc', 'train ticket', 'railway'], domain: 'irctc.co.in', icon: FaTrainSubway, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#003366' },
  { keywords: ['indigo', 'goindigo'], domain: 'goindigo.in', icon: LuPlane, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#001B94' },
  { keywords: ['air india', 'airindia'], domain: 'airindia.com', icon: LuPlane, badgeBg: '#FEF2F2', badgeBorder: '#FECACA', badgeColor: '#ED1B24' },

  // Entertainment & Streaming
  { keywords: ['netflix'], domain: 'netflix.com', icon: SiNetflix, badgeBg: '#FEF2F2', badgeBorder: '#FECACA', badgeColor: '#E50914' },
  { keywords: ['spotify'], domain: 'spotify.com', icon: SiSpotify, badgeBg: '#ECFDF5', badgeBorder: '#A7F3D0', badgeColor: '#1DB954' },
  { keywords: ['youtube', 'yt music'], domain: 'youtube.com', icon: SiYoutube, badgeBg: '#FEF2F2', badgeBorder: '#FECACA', badgeColor: '#FF0000' },
  { keywords: ['hotstar', 'disney'], domain: 'hotstar.com', icon: LuFilm, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#0C2053' },
  { keywords: ['bookmyshow', 'bms'], domain: 'bookmyshow.com', icon: LuTicket, badgeBg: '#FEF2F2', badgeBorder: '#FECACA', badgeColor: '#DC3558' },
  { keywords: ['pvr', 'inox', 'cinepolis'], domain: 'pvrcinemas.com', icon: LuFilm, badgeBg: '#FEF9C3', badgeBorder: '#FEF08A', badgeColor: '#CA8A04' },
  { keywords: ['steam'], domain: 'steampowered.com', icon: SiSteam, badgeBg: '#F1F5F9', badgeBorder: '#CBD5E1', badgeColor: '#171A21' },
  { keywords: ['playstation', 'ps5', 'ps4', 'psn'], domain: 'playstation.com', icon: SiPlaystation, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#003791' },
  { keywords: ['xbox'], domain: 'xbox.com', icon: FaXbox, badgeBg: '#ECFDF5', badgeBorder: '#A7F3D0', badgeColor: '#107C10' },
  { keywords: ['nintendo', 'switch'], domain: 'nintendo.com', icon: LuGamepad2, badgeBg: '#FEF2F2', badgeBorder: '#FECACA', badgeColor: '#E60012' },
  { keywords: ['twitch'], domain: 'twitch.tv', icon: SiTwitch, badgeBg: '#F5F3FF', badgeBorder: '#DDD6FE', badgeColor: '#9146FF' },

  // Tech, AI & Cloud
  { keywords: ['apple', 'app store', 'icloud', 'itunes'], domain: 'apple.com', icon: SiApple, badgeBg: '#F8FAFC', badgeBorder: '#E2E8F0', badgeColor: '#000000' },
  { keywords: ['google', 'play store', 'gsuite', 'google drive'], domain: 'google.com', icon: SiGoogle, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#4285F4' },
  { keywords: ['chatgpt', 'openai'], domain: 'openai.com', icon: LuSparkles, badgeBg: '#ECFDF5', badgeBorder: '#A7F3D0', badgeColor: '#10A37F' },
  { keywords: ['github'], domain: 'github.com', icon: SiGithub, badgeBg: '#F8FAFC', badgeBorder: '#E2E8F0', badgeColor: '#181717' },
  { keywords: ['adobe', 'photoshop', 'illustrator'], domain: 'adobe.com', icon: FaPaintbrush, badgeBg: '#FEF2F2', badgeBorder: '#FECACA', badgeColor: '#FF0000' },
  { keywords: ['notion'], domain: 'notion.so', icon: SiNotion, badgeBg: '#F8FAFC', badgeBorder: '#E2E8F0', badgeColor: '#000000' },
  { keywords: ['figma'], domain: 'figma.com', icon: SiFigma, badgeBg: '#FDF4FF', badgeBorder: '#F5D0FE', badgeColor: '#F24E1E' },
  { keywords: ['canva'], domain: 'canva.com', icon: LuSparkles, badgeBg: '#ECFEFF', badgeBorder: '#A5F3FC', badgeColor: '#00C4CC' },
  { keywords: ['dropbox'], domain: 'dropbox.com', icon: SiDropbox, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#0061FF' },

  // Fintech & Banks & UPI
  { keywords: ['cred'], domain: 'cred.club', icon: FaCreditCard, badgeBg: '#F8FAFC', badgeBorder: '#E2E8F0', badgeColor: '#1A1A1A' },
  { keywords: ['paytm'], domain: 'paytm.com', icon: LuWallet, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#00BAF2' },
  { keywords: ['phonepe'], domain: 'phonepe.com', icon: LuWallet, badgeBg: '#F5F3FF', badgeBorder: '#DDD6FE', badgeColor: '#5F259F' },
  { keywords: ['gpay', 'google pay'], domain: 'pay.google.com', icon: SiGoogle, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#4285F4' },
  { keywords: ['paypal'], domain: 'paypal.com', icon: SiPaypal, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#003087' },
  { keywords: ['stripe'], domain: 'stripe.com', icon: SiStripe, badgeBg: '#EEF2FF', badgeBorder: '#C7D2FE', badgeColor: '#635BFF' },
  { keywords: ['hdfc'], domain: 'hdfcbank.com', icon: FaBuildingColumns, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#004C8F' },
  { keywords: ['icici'], domain: 'icicibank.com', icon: FaBuildingColumns, badgeBg: '#FFF7ED', badgeBorder: '#FFEDD5', badgeColor: '#F37021' },
  { keywords: ['sbi', 'state bank'], domain: 'onlinesbi.sbi', icon: FaBuildingColumns, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#280071' },
  { keywords: ['axis bank', 'axis'], domain: 'axisbank.com', icon: FaBuildingColumns, badgeBg: '#FDF2F8', badgeBorder: '#FBCFE8', badgeColor: '#97144D' },
  { keywords: ['kotak'], domain: 'kotak.com', icon: FaBuildingColumns, badgeBg: '#FEF2F2', badgeBorder: '#FECACA', badgeColor: '#ED1C24' },
  { keywords: ['zerodha'], domain: 'zerodha.com', icon: LuTrendingUp, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#387ED1' },
  { keywords: ['groww'], domain: 'groww.in', icon: LuTrendingUp, badgeBg: '#ECFDF5', badgeBorder: '#A7F3D0', badgeColor: '#00D09C' },

  // Telecom & Utilities
  { keywords: ['jio', 'reliance jio'], domain: 'jio.com', icon: LuZap, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#0A2885' },
  { keywords: ['airtel'], domain: 'airtel.in', icon: LuZap, badgeBg: '#FEF2F2', badgeBorder: '#FECACA', badgeColor: '#EE0000' },
  { keywords: ['vi ', 'vodafone'], domain: 'myvi.in', icon: LuZap, badgeBg: '#FEF2F2', badgeBorder: '#FECACA', badgeColor: '#E60000' },

  // Health & Fitness
  { keywords: ['cult.fit', 'cultfit', 'cure.fit'], domain: 'cult.fit', icon: LuDumbbell, badgeBg: '#F8FAFC', badgeBorder: '#E2E8F0', badgeColor: '#FF3278' },
  { keywords: ['apollo', 'apollo pharmacy'], domain: 'apollopharmacy.in', icon: LuPill, badgeBg: '#ECFDF5', badgeBorder: '#A7F3D0', badgeColor: '#026857' },
  { keywords: ['1mg', 'tata 1mg'], domain: '1mg.com', icon: LuPill, badgeBg: '#FFF7ED', badgeBorder: '#FFEDD5', badgeColor: '#FF6F61' },
  { keywords: ['pharmeasy'], domain: 'pharmeasy.in', icon: LuPill, badgeBg: '#ECFDF5', badgeBorder: '#A7F3D0', badgeColor: '#10847E' },
  { keywords: ['practo'], domain: 'practo.com', icon: LuStethoscope, badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE', badgeColor: '#1B64F2' },
];

/**
 * Intelligent icon matcher that resolves a transaction description or category
 * to a brand logo (with web domain for favicon fetching) or rich semantic React Icon.
 */
export function matchIcon(textOrDesc = '', category = ''): MatchedIconResult {
  const combined = `${textOrDesc} ${category}`.toLowerCase().trim();

  // 1. Check Brand Directory First
  for (const brand of BRAND_DIRECTORY) {
    for (const keyword of brand.keywords) {
      const regex = new RegExp(`(^|\\b|\\s|[-_/])${keyword.replace('.', '\\.')}(\\b|\\s|[-_/]|$)`, 'i');
      if (regex.test(combined) || combined.includes(keyword)) {
        return {
          type: 'brand',
          icon: brand.icon,
          domain: brand.domain,
          bgTone: 'brand',
          badgeBg: brand.badgeBg,
          badgeBorder: brand.badgeBorder,
          badgeColor: brand.badgeColor,
        };
      }
    }
  }

  // 2. Semantic Keyword & Category Matchers
  // Food & Dining
  if (/food|dining|restaurant|cafe|coffee|tea|lunch|dinner|breakfast|snack|bakery|biryani|pizza|burger|sushi|dhaba|canteen|bar|pub/i.test(combined)) {
    const isCoffee = /coffee|tea|cafe|chai|starbucks|brew/i.test(combined);
    const isPizza = /pizza|slice|domino|hut/i.test(combined);
    return {
      type: 'category',
      icon: isCoffee ? LuCoffee : isPizza ? LuPizza : LuUtensils,
      bgTone: 'green',
      badgeBg: '#D1FAE5',
      badgeBorder: '#A7F3D0',
      badgeColor: '#047857',
    };
  }

  // Shopping & Retail & Grocery
  if (/shopping|grocery|mart|store|supermarket|clothes|dress|shirt|pants|shoe|sneaker|electronics|gadget|laptop|phone|gift|mall|retail/i.test(combined)) {
    const isCart = /grocery|mart|supermarket|vegetable|fruit|milk/i.test(combined);
    return {
      type: 'category',
      icon: isCart ? LuShoppingCart : LuShoppingBag,
      bgTone: 'blue',
      badgeBg: '#DBEAFE',
      badgeBorder: '#BFDBFE',
      badgeColor: '#2563EB',
    };
  }

  // Travel & Transport
  if (/travel|transport|flight|airplane|airline|train|railway|metro|bus|cab|taxi|uber|ola|rapido|fuel|petrol|diesel|gasoline|parking|toll|tollgate|trip|vacation|hotel|stay/i.test(combined)) {
    const isFuel = /fuel|petrol|diesel|gas station|cng/i.test(combined);
    const isFlight = /flight|airplane|airline|airport|air/i.test(combined);
    const isTrain = /train|railway|metro|irctc/i.test(combined);
    return {
      type: 'category',
      icon: isFuel ? LuFuel : isFlight ? LuPlane : isTrain ? FaTrainSubway : LuCar,
      bgTone: 'amber',
      badgeBg: '#FEF3C7',
      badgeBorder: '#FDE68A',
      badgeColor: '#B45309',
    };
  }

  // Housing & Rent & Utilities
  if (/rent|housing|home|house|apartment|flat|maintenance|electricity|power|bescom|water|wifi|broadband|internet|cylinder|gas|pipe/i.test(combined)) {
    const isPower = /electricity|power|energy|electric|bescom/i.test(combined);
    const isWater = /water|plumbing|droplet/i.test(combined);
    const isWifi = /wifi|broadband|internet|fiber|cable/i.test(combined);
    return {
      type: 'category',
      icon: isPower ? LuZap : isWater ? LuDroplets : isWifi ? LuWifi : FaHouse,
      bgTone: 'teal',
      badgeBg: '#CCFBF1',
      badgeBorder: '#99F6E4',
      badgeColor: '#0F766E',
    };
  }

  // Entertainment & Gaming & Movies
  if (/entertainment|movie|cinema|film|pvr|inox|theatre|game|gaming|steam|playstation|xbox|music|concert|party|club|pub|ott|streaming/i.test(combined)) {
    const isGame = /game|gaming|ps5|xbox|steam/i.test(combined);
    const isMusic = /music|song|album|concert|spotify/i.test(combined);
    return {
      type: 'category',
      icon: isGame ? LuGamepad2 : isMusic ? LuMusic : LuFilm,
      bgTone: 'coral',
      badgeBg: '#FFE4E6',
      badgeBorder: '#FECDD3',
      badgeColor: '#BE123C',
    };
  }

  // Health, Medical & Fitness
  if (/health|medical|doctor|medicine|pharma|pharmacy|hospital|clinic|dentist|tablet|pill|gym|fitness|workout|cult|trainer/i.test(combined)) {
    const isGym = /gym|fitness|workout|cult|exercise/i.test(combined);
    const isPill = /pharmacy|medicine|pill|drug|tablet|1mg/i.test(combined);
    return {
      type: 'category',
      icon: isGym ? LuDumbbell : isPill ? LuPill : LuHeartPulse,
      bgTone: 'emerald',
      badgeBg: '#DCFCE7',
      badgeBorder: '#86EFAC',
      badgeColor: '#15803D',
    };
  }

  // Income, Salary & Investments
  if (/salary|income|dividend|bonus|stipend|freelance|client|interest|cashback|refund|profit|crypto|stock|shares|mutual fund/i.test(combined)) {
    return {
      type: 'category',
      icon: LuTrendingUp,
      bgTone: 'emerald',
      badgeBg: '#ECFDF5',
      badgeBorder: '#A7F3D0',
      badgeColor: '#059669',
    };
  }

  // Education & Learning
  if (/education|tuition|course|udemy|coursera|college|school|university|book|exam|training/i.test(combined)) {
    return {
      type: 'category',
      icon: LuGraduationCap,
      bgTone: 'indigo',
      badgeBg: '#E0E7FF',
      badgeBorder: '#C7D2FE',
      badgeColor: '#4338CA',
    };
  }

  // Loans, People & Splits
  if (/lend|lent|borrow|borrowed|loan|debt|split|settle|friend|mom|dad|brother|sister|roommate/i.test(combined)) {
    return {
      type: 'category',
      icon: LuUsers,
      bgTone: 'indigo',
      badgeBg: '#EEF2FF',
      badgeBorder: '#C7D2FE',
      badgeColor: '#4F46E5',
    };
  }

  // Default fallback
  return {
    type: 'generic',
    icon: LuCircleDollarSign,
    bgTone: 'slate',
    badgeBg: '#F1F5F9',
    badgeBorder: '#E2E8F0',
    badgeColor: '#475569',
  };
}
