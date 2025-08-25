import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { PublicLayout } from "@/layouts/public-layout";
import AuthenticationLayout from "@/layouts/auth-layout";
import ProtectRoutes from "@/layouts/protected-routes";
import { MainLayout } from "@/layouts/main-layout";

import HomePage from "@/routes/home";
import { SignInPage } from "./routes/sign-in";
import { SignUpPage } from "./routes/sign-up";
import { Generate } from "./components/generate";
import { Dashboard } from "./routes/dashboard";
import { CreateEditPage } from "./routes/create-edit-page";
import { MockLoadPage } from "./routes/mock-load-page";
import { MockInterviewPage } from "./routes/mock-interview-page";
import { Feedback } from "./routes/feedback";
import { Mission } from "./routes/mission";
import { Contact } from "./routes/contact";
import { WebsiteFeedback } from "./routes/website-feedback";
import { StressDetectionDemo } from "./components/stress-detection-demo";

const App = () => {
  return (
    <Router>
      <Routes>
        {}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/mission" element={<Mission />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/website-feedback" element={<WebsiteFeedback />} />
          <Route path="/stress-demo" element={<StressDetectionDemo />} />
        </Route>

        {}
        <Route element={<AuthenticationLayout />}>
          <Route path="/signin/*" element={<SignInPage />} />
          <Route path="/signup/*" element={<SignUpPage />} />
        </Route>

        {}
        <Route
          element={
          <ProtectRoutes>
              <MainLayout />
            </ProtectRoutes>
          }>

          {}
          <Route element={<Generate />} path="/generate">
            <Route index element={<Dashboard />} />
            <Route path="create" element={<CreateEditPage />} />
            <Route path=":interviewId" element={<CreateEditPage />} />
            <Route path="interview/:interviewId" element={<MockLoadPage />} />
            <Route
              path="interview/:interviewId/start"
              element={<MockInterviewPage />} />

            <Route path="feedback/:interviewId" element={<Feedback />} />
          </Route>
        </Route>

        {}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Router>);

};

export default App;