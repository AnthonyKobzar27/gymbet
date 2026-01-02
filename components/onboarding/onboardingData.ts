export interface Slide {
  title: string;
  description: string;
  emoji?: string;
  showLogo?: boolean;
}

export const ONBOARDING_SLIDES: Slide[] = [
  {
    title: 'Welcome to GymBet!',
    description: "We're so incredibly grateful to have you! Gymbets makes working out more fun and consistent through adding a fun incentive - lets show you around!",
    showLogo: true,
  },
  {
    title: 'How It Works',
    description: 'Gymbet operates through games, which are groups of you and 7 other people that agree on a workout split and lock up some amount of [TOKEN] to keep you accountable.',
    showLogo: true,
  },
  {
    title: 'Proofs',
    description: 'Every day of your split, you have to submit an image proof of yourself doing a workout - proofs are checked at 11:59 PST every day, if you forget to submit a proof - youre out!',
    showLogo: true,
  },
  {
    title: 'Win Rewards',
    description: 'You get eliminated for either not submitting a proof (except for rest days), or for submitting a fake / bad proof which gets cross validated by others.',
    showLogo: true,
  },
  {
    title: 'Blocks',
    description: 'In the proofs tab, you can vote on other peoples proofs and win [TOKEN] for voting truthfully! But beware, if you lie you can also lose [TOKEN]! If you think your blocks outcome is incorrect, you can send it up to the devs for review.',
    showLogo: true,
  },
  {
    title: 'Lets get started!',
    description: 'TLDR - Gymbets lets you win fun incentives for staying consistent with your workouts - lets create your account and get started!',
    showLogo: true,
  },
];

