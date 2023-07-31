"use client";

import {
  Button,
  Textarea,
  TextField,
  Link,
  Checkbox,
  Skeleton,
} from "@navikt/ds-react";
import { useEffect, useState } from "react";
import { createEvent, getEvent, updateEvent } from "@/service/eventActions";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import EventDatepicker from "../app/event/new/eventDatepicker";
import { DeltaEvent } from "@/types/event";
import { midnightDate } from "@/service/format";
import { format } from "date-fns";

function isValidParticipantLimit(limit?: string) {
  if (!limit) return false;
  const limit_int = parseInt(limit);
  return !Number.isNaN(limit_int) && 0 < limit_int && limit_int < 10000;
}

const createEventSchema = z
  .object({
    title: z.string().nonempty({ message: "Du må fylle inn en tittel" }),
    location: z.string().nonempty({ message: "Du må fylle inn et sted" }),
    description: z
      .string()
      .nonempty({ message: "Du må fylle inn en beskrivelse" }),
    startDate: z.date({ required_error: "Du må velge en startdato" }),
    startTime: z.string().regex(/[0-9]{2}:[0-9]{2}/, {
      message: "Verdien må være et gyldig tidspunkt",
    }),
    endDate: z.date({ required_error: "Du må velge en sluttdato" }),
    endTime: z.string().regex(/[0-9]{2}:[0-9]{2}/, {
      message: "Verdien må være et gyldig tidspunkt",
    }),
    public: z.boolean(),
    hasParticipantLimit: z.boolean(),
    participantLimit: z.string().optional(),
    hasSignupDeadline: z.boolean(),
    signupDeadlineDate: z.optional(z.date()),
    signupDeadlineTime: z.string().regex(/(?:^$)|(?:^[0-9]{2}:[0-9]{2}$)/, {
      message: "Verdien må være et gyldig tidspunkt",
    }),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "Sluttdato må være etter startdato",
    path: ["endDate"],
  })
  .refine(
    (data) =>
      data.endDate.getTime() !== data.startDate.getTime() ||
      data.endTime > data.startTime,
    {
      message: "Slutttid må være etter starttid",
      path: ["endTime"],
    },
  )
  .refine(
    (data) =>
      !data.hasSignupDeadline ||
      (data.signupDeadlineDate !== undefined &&
        data.signupDeadlineDate <= data.startDate),
    {
      message: "Påmeldingsfrist kan ikke være etter startdato",
      path: ["signupDeadlineDate"],
    },
  )
  .refine(
    (data) =>
      !data.hasSignupDeadline ||
      (data.signupDeadlineDate !== undefined &&
        (data.signupDeadlineDate.getTime() !== data.startDate.getTime() ||
          data.signupDeadlineTime <= data.startTime)),
    {
      message: "Tidspunktet kan ikke være etter starttiden",
      path: ["signupDeadlineTime"],
    },
  )
  .refine(
    (data) =>
      !data.hasParticipantLimit ||
      isValidParticipantLimit(data.participantLimit),
    {
      message: "Må være mellom 1 og 9999",
      path: ["participantLimit"],
    },
  );

export type CreateEventSchema = z.infer<typeof createEventSchema>;

type CreateEventFormProps = { eventId?: string };
export default function CreateEventForm({ eventId }: CreateEventFormProps) {
  const [loading, setLoading] = useState(!!eventId);
  const [event, setEvent] = useState(undefined as DeltaEvent | undefined);
  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId)
      .then((e) => setEvent(e.event))
      .then(() => setLoading(false));
  }, [eventId]);

  return loading ? (
    <>
      <Skeleton variant="text" className="w-full" />
      <Skeleton variant="text" className="w-full" />
      <Skeleton variant="text" className="w-full" />
    </>
  ) : (
    <InternalCreateEventForm event={event} />
  );
}

type InternalCreateEventFormProps = { event?: DeltaEvent };
function InternalCreateEventForm({ event }: InternalCreateEventFormProps) {
  const [hasParticipantLimit, setHasParticipantLimit] = useState(
    (event?.participantLimit || 0) > 0,
  );
  const [hasDeadline, setDeadline] = useState(!!event?.signupDeadline);

  const {
    register,
    trigger,
    getValues,
    control,
    formState: { errors },
    setValue,
  } = useForm<CreateEventSchema>({
    defaultValues: !event
      ? undefined
      : ({
          title: event.title,
          description: event.description,
          location: event.location,
          public: event.public,
          endDate: midnightDate(event.endTime),
          startDate: midnightDate(event.startTime),
          startTime: format(new Date(event.startTime), "HH:mm"),
          hasParticipantLimit,
          participantLimit: event.participantLimit
            ? event.participantLimit.toString()
            : undefined,
          hasSignupDeadline: hasDeadline,
          signupDeadlineDate: event.signupDeadline
            ? midnightDate(event.signupDeadline)
            : undefined,
          signupDeadlineTime: event.signupDeadline
            ? format(new Date(event.signupDeadline), "HH:mm")
            : "",
          endTime: format(new Date(event.endTime), "HH:mm"),
        } satisfies CreateEventSchema),
    resolver: zodResolver(createEventSchema),
  });

  return (
    <form
      action={async () => {
        const valid = await trigger();
        const values = getValues();
        if (!valid) return;
        if (!event) createAndRedirect(values);
        else updateAndRedirect(values, event.id);
      }}
      className="flex flex-col gap-5"
    >
      <TextField
        label="Tittel"
        {...register("title")}
        error={errors.title?.message}
      />
      <TextField
        label="Sted"
        {...register("location")}
        error={errors.location?.message}
      />
      <Textarea
        label="Beskrivelse"
        {...register("description")}
        error={errors.description?.message}
      />
      <div className="flex flex-row flex-wrap justify-left gap-4 pb-0 items-end">
        <EventDatepicker
          name="startDate"
          label="Fra"
          invalidMessage="Du må fylle inn en gyldig startdato"
          requiredMessage="Du må fylle inn en startdato"
          control={control}
          errors={errors}
          hideLabel={false}
        />
        <div
          className={`navds-form-field navds-form-field--medium ${
            errors.startTime && "navds-text-field--error"
          }`}
        >
          <input
            type="time"
            className="navds-text-field__input w-28"
            {...register("startTime")}
          />
          {errors.startTime && (
            <p className="navds-error-message navds-label">
              {errors.startTime.message}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-row flex-wrap justify-left gap-4 pb-0 items-end">
        <EventDatepicker
          name="endDate"
          label="Til"
          invalidMessage="Du må fylle inn en gyldig sluttdato"
          requiredMessage="Du må fylle inn en sluttdato"
          control={control}
          errors={errors}
          hideLabel={false}
        />
        <div
          className={`navds-form-field navds-form-field--medium ${
            errors.endTime && "navds-text-field--error"
          }`}
        >
          <input
            type="time"
            className="navds-text-field__input w-28"
            {...register("endTime")}
          />
          {errors.endTime && (
            <p className="navds-error-message navds-label">
              {errors.endTime.message}
            </p>
          )}
        </div>
      </div>
      <Checkbox {...register("public")}>
        Gjør arrangementet synlig på forsiden
      </Checkbox>
      <div className="flex flex-col max-w-[21rem]">
        <Checkbox
          {...register("hasParticipantLimit")}
          onChange={() => {
            const x = hasParticipantLimit;
            const invalidInput = !isValidParticipantLimit(
              getValues().participantLimit,
            );

            if (x && invalidInput) setValue("participantLimit", undefined);
            setHasParticipantLimit((x) => !x);
          }}
        >
          Begrens maksimalt antall deltakere
        </Checkbox>
        <TextField
          {...register("participantLimit")}
          className={`${!hasParticipantLimit && "hidden"}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          hideLabel
          label="Maksimalt antall deltagere"
          error={errors.participantLimit?.message}
        />
      </div>
      <div>
        <Checkbox
          {...register("hasSignupDeadline")}
          onChange={() => {
            setDeadline((x) => !x);
          }}
        >
          Spesifiser en påmeldingsfrist
        </Checkbox>
        <div
          className={`flex flex-row flex-wrap justify-left gap-4 pb-0 items-end ${
            !hasDeadline && "hidden"
          }`}
        >
          <EventDatepicker
            name="signupDeadlineDate"
            label="Påmeldingsfrist"
            invalidMessage="Du må fylle inn en gyldig påmeldingsfrist"
            requiredMessage="Du må fylle inn en påmeldingsfrist"
            control={control}
            errors={errors}
            hideLabel={true}
          />
          <div
            className={`navds-form-field navds-form-field--medium ${
              errors.signupDeadlineDate && "navds-text-field--error"
            }`}
          >
            <input
              type="time"
              className="navds-text-field__input w-28"
              {...register("signupDeadlineTime")}
            />
            {errors.signupDeadlineTime && (
              <p className="navds-error-message navds-label">
                {errors.signupDeadlineTime.message}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-4">
        <Link className="w-fit h-fit" href={event ? `/event/${event.id}` : "/"}>
          Avbryt
        </Link>
        <Button type="submit">{event ? "Oppdater" : "Opprett"}</Button>
      </div>
    </form>
  );
}

async function createAndRedirect(formData: CreateEventSchema) {
  const event = await createEvent(formData);
  window.location.href = `/event/${event.id}`;
}

async function updateAndRedirect(formData: CreateEventSchema, eventId: string) {
  const event = await updateEvent(formData, eventId);
  window.location.href = `/event/${event.id}`;
}
