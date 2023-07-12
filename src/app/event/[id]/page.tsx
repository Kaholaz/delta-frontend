import { backendUrl } from "@/toggles/utils";
import { DeltaEvent } from "@/types/event";
import { notFound } from "next/navigation";
import { Event } from "@/components/event";

export default async function Page({ params }: { params: { id: string } }) {
  const response = await fetch(`${backendUrl()}/event/${params.id}`, {
    next: { revalidate: 0 },
  });

  // Feilhåndtering
  if (response.status === 404) {
    notFound();
  } else if (response.status === 400) {
    return (
      <section className="w-screen flex-grow flex justify-center items-center">
        Uventet feil
      </section>
    );
  } else if (response.status >= 300) {
    return (
      <section className="w-screen flex-grow flex justify-center items-center">
        Uventet feil
      </section>
    );
  }

  const {event, participants} = await response.json();

  return (
    <main className="flex flex-grow">
      <section className="w-screen flex-grow flex justify-center items-center flex-col gap-3">
        <Event event={event}></Event>
      </section>
    </main>
  );
}
