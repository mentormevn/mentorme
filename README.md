# Mentor Me

Mentor Me hien tai chay tren Next.js va Supabase, khong con dung Express hay SQLite.

## Kien truc hien tai

- Frontend: Next.js Pages Router, phuc vu cac trang HTML legacy thong qua lop page cua Next.
- API: tat ca nghiep vu di qua `pages/api/[...route].js` va duoc xu ly trong `lib/server/api.js`.
- Database: Supabase Postgres la nguon du lieu duy nhat.
- Auth: Supabase Auth cho dang ky, dang nhap, kich hoat tai khoan mentor, va xac thuc bearer token.
- Storage phia client: localStorage chi dung cho cache UI va session client, khong phai nguon su that cua du lieu nghiep vu.

## Bien moi truong

Can cau hinh cac bien sau trong `.env`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
ADMIN_DASHBOARD_PASSWORD=ADMIN2026
```

## Database business model

Chay `supabase/schema.sql` tren Supabase SQL Editor de tao day du schema cho business hien tai.

Cac bang chinh:

- `profiles`: thong tin user co ban, lien ket voi `auth.users`.
- `consultation_requests`: yeu cau tu van tong quan tu landing/admin.
- `mentor_profiles`: ho so mentor duoc public len marketplace, dung cho tim kiem, booking, dashboard mentor.
- `mentor_applications`: don ung tuyen mentor, quy trinh duyet va cap activation code.
- `mentor_profile_drafts`: ban nhap dashboard cua mentor.
- `mentor_profile_update_requests`: yeu cau cap nhat profile gui len admin de duyet.
- `mentor_booking_requests`: booking giua mentee va mentor, ho tro pending/accepted/rejected/completed.
- `mentor_reviews`: review cua mentee gan voi booking da phat sinh.

Business flow duoc ho tro:

- Mentee gui consultation request.
- Ung vien gui mentor application.
- Admin duyet mentor application, sinh activation code, va kich hoat mentor.
- Admin tao mentor profile public truc tiep khi can.
- Mentee dat lich voi mentor.
- Mentor nhan/tu choi booking trong dashboard.
- Mentee gui review cho booking.
- Mentor gui yeu cau cap nhat profile, admin duyet va ap dung len public profile.
- Trang search va mentor detail doc tu business state duoc tong hop tu Supabase.

## API layer

Cac route `/api/...` van giu nguyen de frontend cu khong can doi URL. Mot so nhom route chinh:

- `/api/business-state`
- `/api/consultation-requests`
- `/api/mentor-applications/*`
- `/api/booking-requests/*`
- `/api/reviews`
- `/api/mentor-profile-updates`
- `/api/admin/*`

## Chay du an

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
npm run start
```

## Ghi chu deploy

- Neu deploy len Vercel, khong can custom Express server.
- Can set day du 4 bien moi truong trong Vercel Project Settings.
- Sau khi deploy, cac route `/api/...` se do Next.js xu ly truc tiep.