import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, Status } from 'src/bookings/entities/booking.entity';
import { Role, User } from 'src/users/entities/user.entity';
import { Driver } from 'src/driver/entities/driver.entity';
import { PaymentMethod } from 'src/payment-method/entities/payment-method.entity';
import { Review } from 'src/review/entities/review.entity';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { RoleSwitchingService } from 'src/users/role-switching.service';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private conversationContext = new Map<number, any[]>();

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly analyticsService: AnalyticsService,
    private readonly roleSwitchingService: RoleSwitchingService,
  ) {}

  async chat(userId: number, message: string): Promise<string> {
    try {
      this.logger.log(`Chat request from user ${userId}: ${message}`);
      
      this.addToContext(userId, { role: 'user', content: message, timestamp: new Date() });

      const lowerMessage = message.toLowerCase().trim();
      
      const intent = this.detectIntent(lowerMessage, userId);
      let response: string;

      switch (intent) {
        case 'urgentBooking':
          response = await this.handleUrgentBookingRequest(userId, message);
          break;
        case 'locationBooking':
          response = await this.handleLocationBasedBooking(userId, message);
          break;
        case 'booking':
          response = await this.handleBookingQuery(userId);
          break;
        case 'newBooking':
          response = await this.handleNewBookingInstructions(userId);
          break;
        case 'payment':
          response = await this.handlePaymentQuery(userId);
          break;
        case 'review':
          response = await this.handleReviews(userId);
          break;
        case 'profile':
          response = await this.handleProfile(userId);
          break;
        case 'help':
          response = await this.handleHelpQuery(userId);
          break;
        case 'cancel':
          response = await this.handleCancelBooking(userId);
          break;
        case 'greeting':
          response = await this.handleGreeting(userId);
          break;
        case 'analytics':
          response = await this.handleAnalytics(userId, lowerMessage);
          break;
        case 'system':
          response = await this.handleSystemStatus();
          break;
        default:
          response = await this.handleContextualResponse(userId, message);
      }

      this.addToContext(userId, { role: 'assistant', content: response, timestamp: new Date() });

      return response;
    } catch (error) {
      this.logger.error(`Error processing chat for user ${userId}:`, error);
      return this.getErrorResponse();
    }
  }

  private async handleUrgentBookingRequest(userId: number, message: string): Promise<string> {
    const locations = this.extractLocations(message);
    
    let response = `🚨 **I'll help you get a ride right away!**\n\n`;
    
    if (locations.from && locations.to) {
      response += `📍 **Route Detected:**\n`;
      response += `🚩 From: ${locations.from}\n`;
      response += `🎯 To: ${locations.to}\n\n`;
      
      response += `**🚗 Quick Booking Options:**\n`;
      response += `🟢 [Book Ride Now](/create?from=${encodeURIComponent(locations.from)}&to=${encodeURIComponent(locations.to)})\n`;
      response += `📱 [Emergency Booking](/emergency-booking?from=${encodeURIComponent(locations.from)}&to=${encodeURIComponent(locations.to)})\n\n`;
    } else {
      response += `**Let me help you book a ride:**\n`;
      response += `🚗 [Start Booking Process](/create)\n`;
    }
    
    response += `**⚡ Immediate Actions:**\n`;
    response += `🆘 Emergency Contact: 0700-Rideshare\n`;
    response += `💬 Live Support: Type "help" for immediate assistance\n\n`;
    
    response += `**💡 Tip:** For fastest service, share your exact location and destination!`;
    
    return response;
  }

  private async handleLocationBasedBooking(userId: number, message: string): Promise<string> {
    const locations = this.extractLocations(message);
    
    let response = `🗺️ **Route Planning Assistant**\n\n`;
    
    if (locations.from && locations.to) {
      response += `**📍 Your Journey:**\n`;
      response += `🚩 From: ${locations.from}\n`;
      response += `🎯 To: ${locations.to}\n\n`;
      
      response += `**📊 Journey Details:**\n`;
      response += `⏱️ Estimated Time: 45-60 minutes\n`;
      response += `💰 Estimated Fare: $ 8-12\n`;
      response += `🚗 Available Vehicles: Economy, Comfort\n\n`;
      
      response += `**🚀 Book Your Ride:**\n`;
      response += `🟢 [Book Now](/create?from=${encodeURIComponent(locations.from)}&to=${encodeURIComponent(locations.to)})\n`;
      response += `👥 [Shared Ride](/share?from=${encodeURIComponent(locations.from)}&to=${encodeURIComponent(locations.to)})\n\n`;
    } else {
      response += `I can help you plan your journey! Please provide:\n\n`;
      response += `📍 **Your current location** (e.g., "I'm in Thika")\n`;
      response += `🎯 **Your destination** (e.g., "need to get to Nairobi CBD")\n\n`;
      response += `🚗 [Start Booking](/create) | 💬 Type your journey details\n\n`;
    }

    response += `📱 [Download Mobile App](/landing)`;
    
    return response;
  }

  private extractLocations(message: string): { from?: string, to?: string } {
    const lowerMessage = message.toLowerCase();
    
    let from: string | undefined;
    let to: string | undefined;
    
    // Try to extract "from" location
    if (lowerMessage.includes('i\'m in') || lowerMessage.includes('stuck in') || lowerMessage.includes('i\'m at')) {
      const fromMatch = lowerMessage.match(/(?:i'm in|stuck in|i'm at)\s+([^,\s]+(?:\s+[^,\s]+)*?)(?:\s+(?:how|and|need|to)|$)/i);
      if (fromMatch) {
        from = fromMatch[1].trim();
      }
    }
    
    // Try to extract "to" location
    if (lowerMessage.includes('get to') || lowerMessage.includes('go to') || lowerMessage.includes('to nairobi')) {
      const toMatch = lowerMessage.match(/(?:get to|go to|to)\s+([^,\s]+(?:\s+[^,\s]+)*?)(?:\s|$)/i);
      if (toMatch) {
        to = toMatch[1].trim();
      }
    }
    
    return { from, to };
  }

  resetConversation(userId: number): void {
    this.conversationContext.delete(userId);
    this.logger.log(`Conversation reset for user ${userId}`);
  }

  private addToContext(userId: number, message: any): void {
    if (!this.conversationContext.has(userId)) {
      this.conversationContext.set(userId, []);
    }
    const context = this.conversationContext.get(userId);
    if (context) {
      context.push(message);
      if (context.length > 10) {
        context.shift();
      }
    }
  }

  private detectIntent(message: string, userId: number): string {
    const lowerMessage = message.toLowerCase();
    
    // Priority 1: Emergency/Urgent situations
    if (this.isUrgentRequest(lowerMessage)) {
      return 'urgentBooking';
    }
    
    // Priority 2: Location-based booking requests
    if (this.isLocationBasedBooking(lowerMessage)) {
      return 'locationBooking';
    }
    
    // Priority 3: Specific booking requests
    if (this.isSpecificBookingRequest(lowerMessage)) {
      return 'newBooking';
    }

    const intents = {
      booking: ['booking', 'ride', 'trip', 'book', 'schedule'],
      payment: ['payment', 'pay', 'bill', 'charge', 'refund'],
      driver: ['driver', 'location', 'where', 'pickup', 'drop'],
      review: ['review', 'rating', 'feedback', 'rate'],
      profile: ['profile', 'account', 'settings', 'me'],
      help: ['help', 'support', 'assist', 'what can you do'],
      cancel: ['cancel', 'stop', 'delete', 'remove'],
      greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
      analytics: ['analytics', 'stats', 'statistics', 'dashboard', 'earnings', 'performance'], 
      system: ['system', 'status', 'health', 'active drivers', 'active bookings'],
      newBooking: ['book a ride', 'new ride', 'create booking', 'need a ride', 'book now'],
      roleSwitching: ['switch to driver', 'become driver', 'switch to customer', 'customer mode', 'driver mode', 'change role', 'my role'],
    };

    // Only treat as greeting if it's JUST a greeting (not mixed with requests)
    if (this.isPureGreeting(lowerMessage)) {
      return 'greeting';
    }

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return intent;
      }
    }

    return 'default';
  }

  private isUrgentRequest(message: string): boolean {
    const urgentKeywords = [
      'stuck', 'stranded', 'emergency', 'urgent', 'need help', 'help me',
      'lost', 'trapped', 'can\'t get', 'no way', 'desperate'
    ];
    
    const locationKeywords = [
      'how do i get to', 'how to get to', 'get me to', 'take me to',
      'i need to go to', 'i\'m in', 'i\'m stuck in', 'i\'m at'
    ];
    
    return urgentKeywords.some(keyword => message.includes(keyword)) ||
           locationKeywords.some(keyword => message.includes(keyword));
  }

  private isLocationBasedBooking(message: string): boolean {
    const locationPatterns = [
      'from .+ to .+', 'get to .+', 'go to .+', 'travel to .+',
      'i\'m in .+ need to get to', 'how do i get from .+ to .+'
    ];
    
    // Check for common Kenyan locations
    const kenyanLocations = [
      'nairobi', 'thika', 'kiambu', 'nakuru', 'mombasa', 'kisumu',
      'eldoret', 'cbd', 'westlands', 'karen', 'lavington', 'kasarani'
    ];
    
    return locationPatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(message);
    }) || kenyanLocations.some(location => message.includes(location));
  }

  private isSpecificBookingRequest(message: string): boolean {
    return message.includes('book a ride') || 
           message.includes('new ride') || 
           message.includes('create booking') || 
           message.includes('need a ride') || 
           message.includes('book now');
  }

  private isPureGreeting(message: string): boolean {
    const greetingWords = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    const words = message.split(' ');
    
    // If message is only 1-3 words and contains greeting, it's pure greeting
    if (words.length <= 3) {
      return greetingWords.some(greeting => message.includes(greeting));
    }
    
    return false;
  }

  private async handleBookingQuery(userId: number): Promise<string> {
    const bookings = await this.bookingRepository.find({
      where: { user: { userId: userId } }, 
      order: { pickup_time: 'DESC' },
      take: 5,
      relations: ['user', 'driver'],
    });

    if (bookings.length === 0) {
      return this.formatNoBookingsResponse();
    }

    return this.formatBookingsResponse(bookings);
  }

  private formatNoBookingsResponse(): string {
    return `🚗 **Ready to Book Your First Ride?**

No bookings found yet.

**Quick Actions:**
🆕 Create New Booking: /create
📋 Browse Available Rides: /bookings

**Need Help?**
💬 Type "help" for assistance
📞 Contact Support: /support`;
  }

  private formatBookingsResponse(bookings: any[]): string {
    let response = `📋 **Your Recent Bookings**\n\n`;
    
    bookings.forEach((booking, index) => {
      const statusEmoji = this.getStatusEmoji(booking.status);
      const locationFrom = this.formatLocation(booking.start_latitude, booking.start_longitude);
      const locationTo = this.formatLocation(booking.end_latitude, booking.end_longitude);
      
      response += `**${index + 1}. Booking #${booking.id}** ${statusEmoji}\n`;
      response += `📍 From: ${locationFrom}\n`;
      response += `📍 To: ${locationTo}\n`;
      response += `💰 Fare: $${booking.fare || 0}\n`;
      response += `🔗 View Details: /bookings/${booking.id}\n`;
      response += `─────────────────────\n\n`;
    });

    response += `**Quick Actions:**\n`;
    response += `📋 View All Bookings: /bookings\n`;
    response += `🆕 Book Another Ride: /create\n`;
    response += `📊 View Analytics: /analytics`;

    return response;
  }

  private async handleNewBookingInstructions(userId: number): Promise<string> {
    return `🚗 **How to Book a Ride** - Step by Step Guide

**Step 1: Set Your Pickup Location**
📍 Enter your current location or choose from saved addresses

**Step 2: Choose Your Destination**
🎯 Type in where you want to go

**Step 3: Select Ride Type**
🚙 Economy, Comfort, or Premium options available

**Step 4: Review & Confirm**
💰 Check fare estimate and driver details
✅ Confirm your booking

**Step 5: Track Your Ride**
📱 Watch your driver approach in real-time

**Ready to Book?**
🆕 Start New Booking: /create
📱 Use Mobile App: Download from app store

**Need Help?**
💬 Type "help" for more assistance
📞 Call Support: /support`;
  }

  private getStatusEmoji(status: string): string {
    const statusEmojis = {
      'requested': '🕒',
      'confirmed': '✅',
      'in_progress': '🚗',
      'completed': '🎉',
      'cancelled': '❌',
      'pending': '⏳'
    };
    return statusEmojis[status.toLowerCase()] || '📝';
  }

  private formatLocation(lat: number, lng: number): string {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  private async handlePaymentQuery(userId: number): Promise<string> {
    const paymentMethods = await this.paymentMethodRepository.find({
      where: { user: { userId: userId } },
      relations: ['user'],
    });

    if (paymentMethods.length === 0) {
      return `💳 **Payment Methods**

No payment methods saved yet.

**Get Started:**
💳 Add Payment Method: /payment/bookingId
💡 Tip: Add a payment method for faster bookings!

**Accepted Methods:**
💳 Credit/Debit Cards
📱 Mobile Payments
💰 Paypal`;
    }

    let response = `💳 **Your Payment Methods**\n\n`;
    
    paymentMethods.forEach((pm, index) => {
      const defaultBadge = pm.is_default ? ' 🌟 (Default)' : '';
      const typeEmoji = this.getPaymentTypeEmoji(pm.payment_type);
      
      response += `${index + 1}. ${typeEmoji} **${pm.payment_type}**${defaultBadge}\n`;
    });

    return response;
  }

  private getPaymentTypeEmoji(type: string): string {
    const typeEmojis = {
      'paypal': '📱',
      'mpesa': '',
      'credit_card': '💳',
      'debit_card': '💳'
    };
    return typeEmojis[type.toLowerCase()] || '💳';
  }


  private formatDriverDashboard(driver: any, dashboard: any): string {
    const statusIcon = driver.isAvailable ? '🟢' : '🔴';
    const ratingStars = '⭐'.repeat(Math.floor(driver.rating || 0));
    
    return `🚗 **Driver Dashboard**

**Current Status:** ${statusIcon} ${driver.isAvailable ? 'Available' : 'Offline'}
**Your Rating:** ${ratingStars} ${driver.rating || 'Not rated'}/5

**📊 Weekly Performance:**
💰 Earnings: $${dashboard.weeklyStats.totalEarnings}
🚗 Completed Trips: ${dashboard.weeklyStats.totalDrives}
📈 Growth: ${dashboard.weeklyStats.percentageChange > 0 ? '+' : ''}${dashboard.weeklyStats.percentageChange}%

**🎯 Performance Metrics:**
⭐ Overall Rating: ${dashboard.performanceMetrics.overallRating}/5
👥 Customer Experience: ${dashboard.performanceMetrics.customerExperience}%
⏰ Time Consciousness: ${dashboard.performanceMetrics.timeConsciousness}%
😊 Friendliness: ${dashboard.performanceMetrics.friendliness}%

**🚙 Vehicle Information:**
${dashboard.vehicle ? `🚙 ${dashboard.vehicle.model} - ${dashboard.vehicle.plateNumber}` : '❌ No vehicle registered'}

**Quick Actions:**
🔗 Full Dashboard: /dashboard
📊 Detailed Analytics: /dashboard
🚗 Start Driving: /bookings
📱 Mobile Driver App: Download now`;
  }

  private formatBasicDriverInfo(driver: any): string {
    const statusIcon = driver.isAvailable ? '🟢' : '🔴';
    const ratingStars = '⭐'.repeat(Math.floor(driver.rating || 0));
    
    return `🚗 **Driver Dashboard** (Basic View)

**Status:** ${statusIcon} ${driver.isAvailable ? 'Available' : 'Offline'}
**Rating:** ${ratingStars} ${driver.rating || 'Not rated'}/5

**Quick Actions:**
🔗 View Bookings: /bookings
📊 Performance Stats: /dashboard
⚙️ Settings: /settings
📞 Support: /support`;
  }

  private async handleReviews(userId: number): Promise<string> {
    const reviews = await this.reviewRepository.find({
      take: 5,
      relations: ['user'],
    });

    if (reviews.length === 0) {
      return `You haven't written any reviews yet.

⭐ [Leave a Review](/review)
📋 [View All Reviews](/review)`;
    }

    let response = `**Your Recent Reviews:**\n`;
    reviews.forEach((review, index) => {
      response += `${index + 1}. **${review.rating}/5** - ${review.comment || 'No comment'}\n`;
    });

    response += `\n**Quick Actions:**
⭐ [Leave a New Review](/review)
📋 [View All Reviews](/review)`;

    return response;
  }

  private async handleProfile(userId: number): Promise<string> {
    const user = await this.userRepository.findOne({ where: { userId: userId } }); 
    
    if (!user) {
      return `User profile not found. Please contact support.

🔗 [Contact Support](/support)
🏠 [Return to Dashboard](/dashboard)`;
    }

    return `**Your Profile** 👤
📧 **Email:** ${user.email}
👤 **Name:** ${user.firstName} ${user.lastName}
📱 **Phone:** ${user.phone || 'Not provided'}
🎂 **Member Since:** ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}

**Quick Actions:**
⚙️ [Edit Profile](/account)
🏠 [Dashboard](/dashboard)`;
  }

  private async handleHelpQuery(userId: number): Promise<string> {
    return `**How can I help you?** 🤝

**I can assist you with:**
🚗 **Bookings** - View, create, or manage your rides
💳 **Payments** - Manage payment methods and billing
👤 **Profile** - Update your account information
⭐ **Reviews** - Leave feedback or view your reviews
🚙 **Driver Info** - Driver dashboard and earnings (if you're a driver)

**Quick Commands:**
• Type "bookings" to see your recent rides
• Type "payment" to manage payment methods
• Type "profile" to view your account
• Type "help" anytime for assistance

**Need more help?**
📞 [Contact Support](/support)
❓ [FAQ](/support)
💬 [Live Chat](/support)`;
  }

  private async handleCancelBooking(userId: number): Promise<string> {
    const activeBookings = await this.bookingRepository.find({
      where: { 
        user: { userId: userId },
        status: Status.Requested 
      },
      order: { pickup_time: 'DESC' },
      take: 5,
      relations: ['user', 'driver'],
    });

    if (activeBookings.length === 0) {
      return `You don't have any active bookings to cancel.

📋 [View All Bookings](/bookings)
🆕 [Create New Booking](/create)`;
    }

    let response = `**Bookings Available for Cancellation:**\n\n`;
    activeBookings.forEach((booking, index) => {
      response += `${index + 1}. **Booking #${booking.id}**
📍 From: ${booking.start_latitude}, ${booking.start_longitude}
📍 To: ${booking.end_latitude}, ${booking.end_longitude}
💰 Fare: $${booking.fare || 0}
🔗 [Cancel Booking](/bookings)\n\n`;
    });

    response += `**Note:** Cancellation policies may apply depending on timing.
📋 [View Cancellation Policy](/policy/cancellation)`;

    return response;
  }

  private async handleGreeting(userId: number): Promise<string> {
    const user = await this.userRepository.findOne({ where: { userId: userId } });
    const userName = user ? `${user.firstName || 'there'}` : 'there';

    const hour = new Date().getHours();
    let greeting = 'Hello';
    
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    return `${greeting}, ${userName}! 👋

Welcome to your ride-sharing assistant! I'm here to help you with:

🚗 **Book a ride** - Find and book your next trip
📋 **View bookings** - Check your ride history
💳 **Manage payments** - Update payment methods
👤 **Account settings** - Manage your profile
⭐ **Reviews** - Leave feedback

**What would you like to do today?**

Type anything like "book a ride", "my bookings", or "help" to get started!`;
  }

  private async handleAnalytics(userId: number, message: string): Promise<string> {
    try {
      if (message.includes('driver') || message.includes('earnings')) {
        const driver = await this.driverRepository.findOne({
          where: { user: { userId: userId } },
        });

        if (driver) {
          if (typeof driver.driver_id === 'undefined') {
            return `Driver information is incomplete. Please update your driver profile.

🚗 [Update Driver Profile](/driver)
📋 [View Driver Dashboard](/dashboard)`;
          }
          const driverDashboard = await this.analyticsService.getDriverDashboard(driver.driver_id);
          
          return `**📊 Your Driver Analytics**

**Weekly Performance:**
🚗 Completed Rides: ${driverDashboard.weeklyStats.totalDrives}
💰 Total Earnings: $${driverDashboard.weeklyStats.totalEarnings}
📈 Growth: ${driverDashboard.weeklyStats.percentageChange > 0 ? '+' : ''}${driverDashboard.weeklyStats.percentageChange}% vs last week

**Performance Metrics:**
⭐ Overall Rating: ${driverDashboard.performanceMetrics.overallRating}/5
👥 Customer Experience: ${driverDashboard.performanceMetrics.customerExperience}%
⏰ Time Consciousness: ${driverDashboard.performanceMetrics.timeConsciousness}%
😊 Friendliness: ${driverDashboard.performanceMetrics.friendliness}%

**Top Destinations:**
${driverDashboard.topDestinations.slice(0, 3).map((dest, i) => 
  `${i + 1}. ${dest.destination} - $${dest.price} (${dest.count} trips)`
).join('\n')}

🔗 [View Full Analytics](/dashboard)`;
        }
      }

      const customerDashboard = await this.analyticsService.getCustomerDashboard(userId);
      
      return `**📊 Your Travel Analytics**

**Travel Summary:**
🚗 Total Bookings: ${customerDashboard.totalBookings}
💰 Total Spent: $${customerDashboard.totalExpenditure}

**Weekly Trends:**
📈 This Week: ${customerDashboard.weeklyTrends.currentWeek} rides
📉 Last Week: ${customerDashboard.weeklyTrends.previousWeek} rides
${customerDashboard.weeklyTrends.percentageChange > 0 ? '📈' : '📉'} Change: ${customerDashboard.weeklyTrends.percentageChange}%

**Ride Time Distribution:**
⚡ <10 mins: ${customerDashboard.rideTimeDistribution['<10 mins']} rides
🕐 10-30 mins: ${customerDashboard.rideTimeDistribution['10-30 mins']} rides
🕑 >30 mins: ${customerDashboard.rideTimeDistribution['>30 mins']} rides

🔗 [View Full Dashboard](/dashboard)
📊 [View Detailed Analytics](/analytics)`;

    } catch (error) {
      this.logger.error('Analytics error:', error);
      return `I'm having trouble accessing your analytics right now.

**What I can help you with:**
📊 View travel statistics
💰 Check spending summaries
🚗 Driver performance metrics

Please try again or [contact support](/support) if the issue persists.`;
    }
  }

  private async handleSystemStatus(): Promise<string> {
    try {
      const systemStatus = await this.analyticsService.getSystemStatus();
      
      return `**🌐 System Status** - ${systemStatus.systemHealth.toUpperCase()}

**Current Activity:**
🚗 Active Bookings: ${systemStatus.activeBookings}
👨‍🚗 Available Drivers: ${systemStatus.availableDrivers}
📍 System Health: ${systemStatus.systemHealth}
🕐 Last Update: ${new Date(systemStatus.lastUpdate).toLocaleTimeString()}

**Quick Actions:**
🚗 [Book a Ride](/create)
👨‍🚗 [Become a Driver](/driver-registration)
📊 [View Analytics](/dashboard)

*System monitoring is active 24/7*`;

    } catch (error) {
      return `**🌐 System Status** - CHECKING

I'm having trouble accessing the system status right now.

**Try these instead:**
🚗 [Book a Ride](/create)
📞 [Contact Support](/support)
🏠 [Return to Dashboard](/dashboard)`;
    }
  }

  private async handleContextualResponse(userId: number, message: string): Promise<string> {
    const context = this.conversationContext.get(userId) || [];
    const lowerMessage = message.toLowerCase();
    
    // Handle travel-related queries that weren't caught earlier
    if (lowerMessage.includes('get to') || lowerMessage.includes('travel') || lowerMessage.includes('go to')) {
      return this.handleLocationBasedBooking(userId, message);
    }
    
    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
      return `You're welcome! 😊 Is there anything else I can help you with?

**Quick Actions:**
🚗 [Book a Ride](/create)
📋 [View Bookings](/bookings)
📊 [View Analytics](/dashboard)
👤 [Profile](/account)`;
    }
    
    if (lowerMessage.includes('earnings') || lowerMessage.includes('money') || lowerMessage.includes('income')) {
      return `I can help you check your earnings! 💰

**Available Options:**
📊 Type "analytics" to see your detailed statistics
🚗 Type "driver" to view your driver dashboard
💳 Type "payment" to manage payment methods

**Quick Links:**
📈 [Driver Analytics](/dashboard)
💰 [Earnings Report](/dashboard)`;
    }

    if (lowerMessage.includes('performance') || lowerMessage.includes('rating') || lowerMessage.includes('score')) {
      return `I can show you your performance metrics! ⭐

**Check Your Performance:**
📊 Type "analytics" for detailed performance stats
⭐ Type "reviews" to see your recent reviews
🚗 Type "driver" for your driver dashboard

**Performance Areas:**
👥 Customer Experience
⏰ Time Consciousness  
😊 Friendliness Score`;
    }
    
    if (lowerMessage.includes('problem') || lowerMessage.includes('issue') || lowerMessage.includes('error')) {
      return `I'm sorry to hear you're experiencing an issue. Let me help you resolve it.

**Common Solutions:**
🔄 Try refreshing the page
📱 Check your internet connection
🆕 Try creating a new booking
📊 Check system status with "system status"

**Still need help?**
📞 [Contact Support](/support)
💬 [Live Chat](/support)
📧 [Email Support](mailto:support@rideshare.com)`;
    }
    
    return `I'm here to help! 🤝

**I understand you might need:**
🚗 **Immediate ride booking** - Type "book a ride from [location] to [destination]"
� **Location help** - Tell me where you are and where you need to go
🆘 **Emergency assistance** - Type "emergency" for urgent help

**Quick Examples:**
• "I need to get from Thika to Nairobi"
• "Book a ride to the airport"
• "I'm stuck and need help"

**Or try:**
💬 Type "help" for full assistance menu
`;
  }

  private getErrorResponse(): string {
    return `I apologize, but I encountered an error while processing your request. 😔

**Please try:**
🔄 Asking your question again
📱 Refreshing the page
⏰ Waiting a moment and retrying

**Need immediate help?**
📞 [Contact Support](/support)
💬 [Live Chat](/support)

I'm here to help once the issue is resolved!`;
  }

  private async handleRoleSwitching(userId: number, message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('my role') || lowerMessage.includes('current role')) {
      try {
        const roleInfo = await this.roleSwitchingService.getCurrentRole(userId);
        
        return `👤 **Your Current Role Status**

**Active Role:** ${roleInfo.activeRole.toUpperCase()} Mode
**Available Roles:** ${roleInfo.availableRoles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')}

**Role Switching Options:**
${roleInfo.canSwitchToDriver ? '🚗 Switch to Driver: Type "switch to driver"' : ''}
${roleInfo.canSwitchToCustomer ? '🛍️ Switch to Customer: Type "switch to customer"' : ''}
${roleInfo.requiresDriverSetup ? '📝 Complete Driver Setup: /driver-registration' : ''}

**Quick Actions:**
📊 View Dashboard: /dashboard
⚙️ Account Settings: /profile
🔄 Enable Driver Mode: Type "enable driver" (if not available)`;

      } catch (error) {
        return `❌ Unable to retrieve your role information. Please try again or contact support.`;
      }
    }
    
    if (lowerMessage.includes('switch to driver') || lowerMessage.includes('become driver')) {
      try {
        const result = await this.roleSwitchingService.switchToDriver(userId);
        
        if (result.success) {
          if (result.requiresDriverSetup) {
            return `🚗 **Driver Mode Setup Required**

To start driving, you need to complete your driver profile:

**Required Steps:**
📝 Complete Driver Application: /driver-registration

**Once verified, you can:**
🔄 Switch between roles anytime
💰 Start earning as a driver
📱 Access driver dashboard

**Current Status:** Customer Mode
🔗 [Start Driver Registration](/driver-registration)`;
          } else {
            return `✅ **Successfully Switched to Driver Mode**

🚗 You're now in driver mode and ready to accept rides!

**Driver Dashboard:**
📊 View Earnings: /dashboard
📋 View Bookings: /bookings

**Quick Actions:**
🟢 Go Online: /dashboard
📱 Driver App: Download now
🔄 Switch to Customer: Type "switch to customer"

**Available Roles:** ${result.availableRoles?.join(', ')}`;
          }
        } else {
          return `⚠️ ${result.message}

**Available Options:**
${result.availableRoles?.includes(Role.DRIVER) ? '🚗 Complete driver setup first' : '📝 Enable driver mode: Type "enable driver"'}
🔄 Check current role: Type "my role"`;
        }
      } catch (error) {
        return `❌ Unable to switch to driver mode. ${error.message || 'Please try again or contact support.'}`;
      }
    }
    
    if (lowerMessage.includes('switch to customer') || lowerMessage.includes('customer mode')) {
      try {
        const result = await this.roleSwitchingService.switchToCustomer(userId);
        
        if (result.success) {
          return `✅ **Successfully Switched to Customer Mode**

🛍️ You're now in customer mode!

**Quick Actions:**
🚗 Book a Ride: /create
📋 View My Bookings: /bookings
📍 Manage Locations: /drive

**Need to drive again?**
🔄 Type "switch to driver" anytime
💰 Resume earning when ready

**Available Roles:** ${result.availableRoles?.join(', ')}`;
        } else {
          return `⚠️ ${result.message}

**Available Options:**
🔄 Check current role: Type "my role"
📞 Contact Support: /support`;
        }
        
      } catch (error) {
        return `❌ Unable to switch to customer mode. ${error.message || 'Please try again or contact support.'}`;
      }
    }
    
    if (lowerMessage.includes('enable driver')) {
      try {
        const result = await this.roleSwitchingService.enableDriverMode(userId);
        
        return `✅ **Driver Mode ${result.success ? 'Enabled' : 'Status'}**

${result.message}

**Next Steps:**
${result.requiresDriverSetup ? '📝 Complete Driver Registration: /driver/register' : '🚗 Switch to Driver Mode: Type "switch to driver"'}
🔄 Check available roles: Type "my role"

**Available Roles:** ${result.availableRoles?.join(', ')}`;
      } catch (error) {
        return `❌ Unable to enable driver mode. Please contact support.`;
      }
    }
    
    return "";
  }
}