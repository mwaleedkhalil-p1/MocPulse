import { Headings } from "@/components/headings";
import { InterviewPin } from "@/components/pin";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/config/firebase.config";
import { Interview } from "@/types";
import { useAuth } from "@clerk/clerk-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export const Dashboard = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { userId } = useAuth();

  useEffect(() => {
    setLoading(true);
    const interviewQuery = query(
      collection(db, "interviews"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      interviewQuery,
      (snapshot) => {
        const interviewList: Interview[] = snapshot.docs.map((doc) => {
          const id = doc.id;
          return {
            id,
            ...doc.data(),
          };
        }) as Interview[];
        setInterviews(interviewList);
        setLoading(false);
      },
      (error) => {
        console.log("Error on fetching : ", error);
        toast.error("Error..", {
          description: "Something went wrong. Please try again later..",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const filteredAndSortedInterviews = useMemo(() => {
    return interviews
      .filter(interview =>
        interview.position.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [interviews, searchQuery]);

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <Headings
          title="Dashboard"
          description="Create and start you AI Mock interview"
        />
        <Link to={"/generate/create"}>
          <Button size={"sm"}>
            <Plus /> Add New
          </Button>
        </Link>
      </div>

      <Separator className="my-8" />

      <div className="w-full flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by job role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="md:grid md:grid-cols-3 gap-3 py-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 md:h-32 rounded-md" />
          ))
        ) : filteredAndSortedInterviews.length > 0 ? (
          filteredAndSortedInterviews.map((interview) => (
            <InterviewPin key={interview.id} interview={interview} />
          ))
        ) : (
          <div className="md:col-span-3 w-full flex flex-grow items-center justify-center h-96 flex-col">
            <img
              src="/assets/svg/not-found.svg"
              className="w-44 h-44 object-contain"
              alt=""
            />

            <h2 className="text-lg font-semibold text-muted-foreground">
              No Data Found
            </h2>

            <p className="w-full md:w-96 text-center text-sm text-neutral-400 mt-4">
              {searchQuery
                ? "No interviews match your search criteria"
                : "There is no available data to show. Please add some new mock interviews"}
            </p>

            <Link to={"/generate/create"} className="mt-4">
              <Button size={"sm"}>
                <Plus className="min-w-5 min-h-5 mr-1" />
                Add New
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
};
