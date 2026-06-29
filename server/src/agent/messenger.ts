export const NEED_LABELS: Record<string, string> = {
  food: 'food',
  water: 'water',
  shelter: 'shelter',
  warmth: 'warmth/blankets',
  medicine: 'medicine',
  medical_attention: 'medical help',
  transport: 'a ride',
  clothing: 'clothing',
  childcare: 'childcare',
  mental_health: 'mental health support',
  financial: 'financial help',
  power: 'power/charging',
  general: 'help'
};

export const MESSAGES = {
  chained: (summaries: string[]) =>
    summaries.length === 1
      ? `Help is on the way! ${summaries[0]} Reply CANCEL if you no longer need this.`
      : `Help is coming for all your needs:\n${summaries
          .map((s, i) => `${i + 1}. ${s}`)
          .join('\n')}\nReply CANCEL to cancel any of these.`,

  matchSummary: (need: string, helperName: string, distKm: number) =>
    `${NEED_LABELS[need] || need}: ${helperName} (${
      distKm < 1 ? 'less than 1km' : distKm.toFixed(1) + 'km'
    } away) is confirmed`,

  helperNotification: (need: string, desc: string, address: string) =>
    `New request nearby: someone needs ${NEED_LABELS[need] || need}.${
      desc ? ' Details: ' + desc : ''
    } Address: ${address || 'Location shared'}. Reply YES to help or NO to skip.`,

  volunteerDispatch: (pickup: string, dropoff: string, eta: string) =>
    `New job: pickup from ${pickup}, deliver to ${dropoff} by ${eta}. Reply GO to accept or SKIP to pass.`,

  driverEnRoute: (eta: string) =>
    `Your helper is on the way. Estimated arrival: ${eta}. Reply STOP at any point to cancel and we'll alert emergency services.`,

  deliveryConfirmed: (helperName: string, need: string, total: number) =>
    `${helperName} confirmed your ${NEED_LABELS[need] || need} was delivered. You're all set. If you need anything else just text us.`,

  donorImpact: (helperName: string, need: string, count: number) =>
    `Your ${NEED_LABELS[need] || need} reached ${helperName} today. That's ${count} people you've helped through ARIA. Thank you.`,

  autoRouted: (charityName: string, itemType: string, pickupWindow: string) =>
    `Your ${itemType} donation is going to ${charityName}. They'll collect it ${pickupWindow}. Thank you for not letting it go to waste.`,

  queued: (need: string) =>
    `We've logged your need for ${NEED_LABELS[need] || need}. No one available right now but we're watching. You'll hear from us the moment someone can help. Reply URGENT if this becomes life-threatening.`,

  safetyCheckIn: (helperName: string) =>
    `Did ${helperName} arrive? Reply YES if all good or STOP if you need emergency help.`
};
