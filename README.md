# Altster - Spotify QR Code Scanner

A mobile-first React application that scans Spotify QR codes and plays the songs directly in your browser. Built with React, TypeScript, Vite, and the Spotify Web API.

## Features

- **QR Code Scanning**: Use your device camera to scan Spotify song QR codes
- **Instant Playback**: Play 30-second song previews without logging in
- **Full Track Playback**: Log in with Spotify Premium for full-length tracks
- **Mobile-First Design**: Optimized for mobile devices with responsive UI
- **OAuth 2.0 PKCE**: Secure authentication flow for frontend apps
- **Hybrid Player**: Automatically switches between preview and full playback

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **html5-qrcode** - QR code scanning
- **Spotify Web API** - Music data and playback
- **Spotify Web Playback SDK** - Full track playback for Premium users

## Prerequisites

- Node.js 18 or higher
- A Spotify account (Premium required for full track playback)
- Modern browser with camera support (Chrome, Safari, Firefox)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd altster
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Spotify Developer App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **"Create app"**
4. Fill in the form:
   - **App name**: "Altster QR Scanner" (or any name)
   - **App description**: "QR code scanner for Spotify songs"
   - **Redirect URI**: `http://localhost:5173/callback`
   - Check **"Web API"** and **"Web Playback SDK"**
5. Click **"Save"**
6. Go to **"Settings"** and copy your **Client ID**

### 4. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Spotify Client ID:

```env
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
```

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 6. Access from Mobile Device (Optional)

To test on a real mobile device:

1. Make sure your mobile device is on the same network as your computer
2. Find your computer's local IP address:
   - **macOS/Linux**: `ifconfig | grep inet`
   - **Windows**: `ipconfig`
3. Access the app at `http://YOUR_IP:5173` on your mobile device

**Note**: For camera access on iOS Safari, you'll need HTTPS. Use a tool like [ngrok](https://ngrok.com/):

```bash
ngrok http 5173
```

Then update your Spotify app's redirect URI to include the ngrok URL.

## Usage

### Without Login (Preview Playback)

1. Open the app on your mobile device
2. Grant camera permissions when prompted
3. Point your camera at a Spotify QR code
4. The song will automatically play a 30-second preview
5. Use the play/pause controls to manage playback

### With Login (Full Playback)

1. Click **"Login with Spotify"** in the header
2. Authorize the app
3. Scan a Spotify QR code
4. If you have Spotify Premium, the full track will play
5. Non-Premium users will still get 30-second previews

### Getting Spotify QR Codes

1. Open the Spotify mobile app
2. Find a song you want to share
3. Tap the three dots (⋯) on the song
4. Select **"Share" → "QR Code"**
5. Scan the displayed QR code with Altster

Alternatively, generate QR codes at [Spotify Codes](https://www.spotify.com/us/codes/)

## Project Structure

```
altster/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── QRScanner.tsx   # QR scanning interface
│   │   ├── SpotifyPlayer.tsx # Audio player
│   │   ├── Header.tsx      # App header
│   │   ├── LoginButton.tsx # Auth button
│   │   └── ErrorDisplay.tsx # Error messages
│   ├── hooks/              # Custom React hooks
│   │   ├── useQRScanner.ts
│   │   ├── useSpotifyAuth.ts
│   │   └── useSpotifyPlayer.ts
│   ├── lib/                # Utilities and logic
│   │   ├── spotify/        # Spotify API integration
│   │   │   ├── auth.ts     # OAuth PKCE implementation
│   │   │   ├── api.ts      # API wrapper
│   │   │   ├── player.ts   # Playback logic
│   │   │   └── types.ts    # TypeScript types
│   │   ├── qr/             # QR code utilities
│   │   │   └── parser.ts   # URL parsing
│   │   └── utils.ts        # General utilities
│   ├── store/              # Zustand state stores
│   │   ├── authStore.ts    # Authentication state
│   │   ├── scanStore.ts    # Scanning state
│   │   └── playerStore.ts  # Player state
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── .env.example            # Environment variable template
├── package.json            # Dependencies
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
└── tsconfig.json           # TypeScript configuration
```

## How It Works

### 1. QR Code Scanning

- Uses the `html5-qrcode` library to access the device camera
- Continuously scans for QR codes in the camera feed
- Parses Spotify URLs (format: `https://open.spotify.com/track/{id}` or `spotify:track:{id}`)
- Validates and extracts the track ID

### 2. Authentication (OAuth PKCE)

- Implements OAuth 2.0 with PKCE (Proof Key for Code Exchange)
- Generates a random code verifier and SHA-256 code challenge
- Redirects to Spotify authorization page
- Exchanges authorization code for access and refresh tokens
- Stores tokens securely in localStorage
- Automatically refreshes tokens before expiration

### 3. Hybrid Playback

**Unauthenticated Users:**
- Fetches track data using Spotify Web API
- Plays 30-second preview using HTML5 Audio

**Authenticated Premium Users:**
- Initializes Spotify Web Playback SDK
- Creates a virtual player device
- Transfers playback to the browser
- Plays full-length tracks

**Fallback Strategy:**
- Always tries full playback first (if authenticated)
- Falls back to preview if SDK fails
- Shows clear error if no preview is available

## Troubleshooting

### Camera Not Working

- **Permission Denied**: Check browser settings and allow camera access
- **iOS Safari**: Requires HTTPS. Use ngrok or deploy to a hosting service
- **Camera Not Found**: Make sure your device has a camera
- **Already in Use**: Close other apps using the camera

### Authentication Issues

- **Redirect Error**: Verify the redirect URI matches exactly in your Spotify app settings
- **Client ID Error**: Double-check your `.env.local` file has the correct Client ID
- **Token Expired**: The app automatically refreshes tokens, but you can log out and log back in

### Playback Issues

- **No Preview**: Some tracks don't have previews. Try logging in for full playback.
- **Premium Required**: Full playback requires Spotify Premium. Previews work for everyone.
- **Playback Failed**: Make sure you have an active Spotify session (even for Premium)

### QR Code Not Scanning

- **Poor Lighting**: Move to a well-lit area
- **Blurry Image**: Hold your device steady
- **Wrong Format**: Make sure it's a Spotify QR code (not a regular URL QR code)
- **Distance**: Adjust the distance between camera and QR code

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Deployment

#### Vercel (Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Add environment variables in Vercel dashboard
4. Update Spotify app redirect URI with production URL

#### Netlify

1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy --prod`
3. Configure environment variables
4. Update Spotify redirect URI

**Important**: Remember to add your production URL to the Spotify app's redirect URIs!

## Browser Support

- Chrome 90+ (mobile and desktop)
- Safari 14+ (iOS and macOS)
- Firefox 88+ (mobile and desktop)
- Edge 90+

Camera access requires HTTPS in production.

## Security Considerations

- OAuth PKCE flow (no client secret in frontend)
- CSRF protection with state parameter
- Tokens stored in localStorage (consider httpOnly cookies for production)
- All QR codes validated before processing
- Camera permissions handled gracefully

## Performance Optimizations

- Lazy loading of Spotify Web Playback SDK
- Debounced QR code scanning (2-second cooldown)
- Automatic token refresh (5 minutes before expiration)
- Optimized images from Spotify CDN
- Code splitting with Vite

## Future Enhancements

- [ ] PWA support (offline mode, installable)
- [ ] Playlist scanning and queue management
- [ ] Recent scans history
- [ ] Share functionality
- [ ] Custom QR code generator
- [ ] Dark/light theme toggle
- [ ] Analytics and scan tracking

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [html5-qrcode](https://github.com/mebjas/html5-qrcode)
- [Zustand](https://github.com/pmndrs/zustand)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

## Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Search existing issues on GitHub
3. Create a new issue with detailed information

---

Built with ♥ by [Your Name]

Enjoy scanning and listening!
