# 🚀 CRM Software - Complete Sales Management System

A modern, full-featured Customer Relationship Management (CRM) application built with Next.js 16, TypeScript, and Tailwind CSS. Designed for sales teams to manage leads, track pipeline progress, and monitor commissions.

![CRM Dashboard](https://img.shields.io/badge/Status-Production-green)
![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-cyan)
![Prisma](https://img.shields.io/badge/Prisma-5.22.0-green)

## ✨ Features

### 🎯 Core Functionality
- **Sales Pipeline Management** - 7-stage Kanban board with drag-and-drop
- **Lead Management** - Complete CRUD operations with detailed profiles
- **Commission Tracking** - Automatic calculation and payment status
- **User Authentication** - Secure login with role-based access
- **Dashboard Analytics** - Real-time metrics and charts

### 📊 Advanced Features
- **Stage-Specific Data Entry** - Custom forms for each pipeline stage
- **Activity Logging** - Track all interactions with leads
- **Admin User Assignment** - Admins can assign leads to team members
- **Automatic Lead Assignment** - Leads auto-assign to creators
- **Responsive Design** - Works perfectly on mobile, tablet, and desktop

### 🎨 Modern UI/UX
- **Gradient Themes** - Beautiful indigo/purple color scheme
- **Mobile-First Design** - Responsive across all devices
- **Interactive Elements** - Smooth animations and hover effects
- **Professional Styling** - Modern card-based layouts

## 🛠️ Tech Stack

### Frontend
- **Next.js 16.1.6** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Hook Form** - Form management with validation
- **Zod** - Schema validation

### Backend & Database
- **Next.js API Routes** - Serverless API endpoints
- **Prisma 5.22.0** - Modern ORM for TypeScript
- **SQLite** - Lightweight database (development)
- **NextAuth.js 4.24.13** - Authentication library

### UI & Interactions
- **@dnd-kit** - Drag and drop functionality
- **Recharts** - Data visualization
- **Lucide React** - Modern icon library
- **React Hot Toast** - Notification system

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/danielagblo/CRMSOFTWARE.git
cd crm-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up the database**
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) Seed with sample data
npx tsx seed.ts
```

4. **Start the development server**
```bash
npm run dev
```

5. **Open your browser**
```
http://localhost:3000
```

## 📁 Project Structure

```
crm-app/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/              # API routes
│   │   ├── dashboard/        # Dashboard page
│   │   ├── pipeline/         # Sales pipeline
│   │   ├── leads/            # Lead management
│   │   ├── commissions/      # Commission tracking
│   │   ├── login/            # Authentication
│   │   └── register/         # User registration
│   ├── components/           # React components
│   │   ├── LeadCard.tsx      # Draggable lead cards
│   │   ├── LeadForm.tsx      # Lead creation form
│   │   ├── StageDataModal.tsx # Stage-specific forms
│   │   └── LeadDataViewer.tsx # Data display modal
│   └── lib/                  # Utility libraries
│       ├── auth.ts           # NextAuth configuration
│       └── prisma.ts         # Database client
├── public/                   # Static assets
└── package.json
```

## 🎯 Usage Guide

### User Roles
- **Admin**: Full access, can assign leads to users
- **Sales Representative**: Can manage their assigned leads

### Sales Pipeline Stages
1. **Find Leads** - Initial lead discovery
2. **Contact Client** - First contact attempt
3. **Present Service** - Service presentation
4. **Negotiate** - Price and terms negotiation
5. **Close Deal** - Final agreement (triggers commission)
6. **Payment** - Payment processing
7. **Client Retention** - Ongoing relationship management

### Key Workflows

#### Adding a Lead (Admin)
1. Navigate to Leads page
2. Click "Add Lead"
3. Fill in personal and business information
4. Select user assignment (or leave empty for auto-assignment)
5. Submit to create lead

#### Managing Pipeline
1. Go to Pipeline page
2. Drag leads between stages
3. Click on lead cards to add stage-specific data
4. Use "Next" button for quick stage advancement

#### Commission Tracking
1. Visit Commissions page
2. View total earnings and pending payments
3. Monitor commission status (Pending/Paid)

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Optional: Email configuration for production
# EMAIL_SERVER_HOST=
# EMAIL_SERVER_PORT=
# EMAIL_SERVER_USER=
# EMAIL_FROM=
```

### Database Schema
The application uses Prisma with the following main models:
- **User**: Authentication and role management
- **Lead**: Customer/lead information
- **Commission**: Earnings tracking
- **Activity**: Interaction logging
- **StageData**: Pipeline stage information

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth handlers

### Leads & Pipeline
- `GET/POST /api/leads` - Lead CRUD operations
- `GET/PUT/DELETE /api/leads/[id]` - Individual lead management
- `POST /api/stage-data` - Stage-specific data storage

### Analytics
- `GET /api/dashboard` - Dashboard metrics
- `GET /api/commissions` - Commission data
- `GET /api/activities` - Activity logs

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Other Platforms
The app can be deployed to any platform supporting Node.js:
- Netlify
- Railway
- Render
- DigitalOcean App Platform

### Production Database
For production, update `DATABASE_URL` in your environment variables to use PostgreSQL or another production database.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Database powered by [Prisma](https://prisma.io/)
- Authentication by [NextAuth.js](https://next-auth.js.org/)

## 📞 Support

For support, email danielagblo@example.com or create an issue in this repository.

---

**Made with ❤️ by Daniel Agblo**
npx prisma migrate dev --name init
npx prisma generate
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3001](http://localhost:3001) in your browser

## Default Admin User

- Email: admin@crm.com
- Password: admin123

## Project Structure

```
src/
├── app/
│   ├── api/          # API routes
│   ├── dashboard/    # Dashboard page
│   ├── leads/        # Leads management
│   ├── pipeline/     # Sales pipeline
│   ├── commissions/  # Commission tracking
│   └── login/        # Authentication
├── components/       # Reusable components
├── lib/             # Utilities and configurations
└── prisma/          # Database schema and migrations
```

## Database Schema

- **User**: Authentication and roles
- **Lead**: Contact and deal information
- **Activity**: Lead interaction history
- **Commission**: Earnings tracking

## Deployment

This app can be deployed to Vercel, Netlify, or any platform supporting Next.js.

For production, update the DATABASE_URL in `.env` to use PostgreSQL or another database.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
