import React, { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import UserLayout from "../user/components/layout/UserLayout";

const Home = lazy(() => import("../user/pages/home/home"));
const Auth = lazy(() => import("../user/pages/auth/auth/auth"));
const Profile = lazy(() => import("../user/pages/account/profile/profile"));
const MyOrder = lazy(() => import("../user/pages/account/myorders/MyOrder"));
const Wishlist = lazy(() => import("../user/pages/account/wishlist/Wishlist"));
const TrackOrder = lazy(() => import("../user/pages/account/trackorder/TrackOrder"));
const Cart = lazy(() => import("../user/pages/shop/cart/Cart"));
const Checkout = lazy(() => import("../user/pages/shop/checkout/Checkout"));
const About = lazy(() => import("../user/pages/content/about/about"));
const Contact = lazy(() => import("../user/pages/content/contact/contact"));
const Shipping = lazy(() => import("../user/pages/content/shipping/shipping"));
const Returns = lazy(() => import("../user/pages/content/returns/returns"));
const FaqPage = lazy(() => import("../user/pages/content/faq/FaqPage"));
const TermsOfService = lazy(() => import("../user/pages/content/terms/TermsOfService"));
const BlogListing = lazy(() => import("../user/pages/content/blogs/BlogListing"));
const Careers = lazy(() => import("../user/pages/content/careers/Careers"));
const BestSellers = lazy(() => import("../user/pages/catalog/best-sellers/BestSellers"));
const IgnouPortal = lazy(() => import("../user/pages/catalog/ignou-portal/IgnouPortal"));
const CustomizedProject = lazy(() => import("../user/pages/catalog/customizedProject/CustomizedProject"));
const AssignmentInquiry = lazy(() => import("../user/pages/catalog/assignmentInquiry/AssignmentInquiry"));
const ProjectInquiry = lazy(() => import("../user/pages/catalog/projectInquiry/ProjectInquiry"));
const SynopsisListing = lazy(() => import("../user/pages/catalog/synopsis/SynopsisListing"));
const SynopsisDetail = lazy(() => import("../user/pages/catalog/synopsis/SynopsisDetail"));
const PracticalListing = lazy(() => import("../user/pages/catalog/practical/PracticalListing"));
const PracticalDetail = lazy(() => import("../user/pages/catalog/practical/PracticalDetail"));
const InternshipListing = lazy(() => import("../user/pages/catalog/internship/InternshipListing"));
const InternshipDetail = lazy(() => import("../user/pages/catalog/internship/InternshipDetail"));
const QuestionBank = lazy(() => import("../user/pages/catalog/maindegree/question bank/question"));
const Ai = lazy(() => import("../user/pages/catalog/maindegree/ai not/ai"));
const MainDegreesPage = lazy(() => import("../user/pages/catalog/frontdegrees/MainDegreesPage"));
const SubDegreesPage = lazy(() => import("../user/pages/catalog/subdegrees/SubDegreesPage"));
const CategorizedProductsPage = lazy(() => import("../user/pages/catalog/productlisting/CategorizedProductsPage"));
const BookProducts = lazy(() => import("../user/pages/catalog/bookproducts/BookProducts"));
const Page404 = lazy(() => import("../page not found/404"));
const ProductPage = lazy(() => import("../user/components/productpage/productpage"));
const BlogDetails = lazy(() => import("../user/pages/home/blogdetails/BlogDetails"));
const Comboproduct = lazy(() => import("../user/pages/catalog/comboproduct/comboproduct"));
const ComboDetail = lazy(() => import("../user/components/ComboDetail/ComboDetail"));
const FeaturedSectionPage = lazy(() => import("../user/pages/catalog/featuredSection/FeaturedSectionPage"));

export default function Routing() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/auth" element={<Auth />} />

        <Route element={<UserLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/myorder" element={<MyOrder />} />
          <Route path="/shipping" element={<Shipping />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/combo-books" element={<Comboproduct />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/best-sellers" element={<BestSellers />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/blogs" element={<BlogListing />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/projects" element={<SynopsisListing />} />
          <Route path="/projects/:id" element={<SynopsisDetail />} />
          <Route path="/practical" element={<PracticalListing />} />
          <Route path="/practical/:id" element={<PracticalDetail />} />
          <Route path="/internship" element={<InternshipListing />} />
          <Route path="/internship/:id" element={<InternshipDetail />} />
          <Route path="/customized-project" element={<CustomizedProject />} />
          <Route path="/assignment-inquiry" element={<AssignmentInquiry />} />
          <Route path="/project-inquiry" element={<ProjectInquiry />} />
          <Route path="/blog/:id" element={<BlogDetails />} />
          <Route path="/productpage/:id" element={<ProductPage />} />
          <Route path="/question/:id" element={<QuestionBank />} />
          <Route path="/ainotes/:id" element={<Ai />} />
          <Route path="/combo/:id" element={<ComboDetail />} />
          <Route path="/books/:bookId" element={<BookProducts />} />
          <Route path="/main-degrees/:bookId" element={<MainDegreesPage />} />
          <Route path="/sub-degrees/:bookId/:mainDegreeId" element={<SubDegreesPage />} />
          <Route path="/featured-section/:id" element={<FeaturedSectionPage />} />
          <Route path="/categorized-products/:bookId/:mainDegreeId/:subDegreeId" element={<CategorizedProductsPage />} />
          <Route path="/faqs" element={<FaqPage />} />
          <Route path="/ignou/:type" element={<IgnouPortal />} />
        </Route>

        <Route path="*" element={<Page404 />} />
      </Routes>
    </Suspense>
  );
}
