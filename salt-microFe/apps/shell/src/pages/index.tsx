import { useForm, SubmitHandler } from "react-hook-form";
import { InputField } from "@repo/ui/input";

interface IFormInput {
  id: string;
  gender: string;
}

export default function App() {
  const { register, handleSubmit } = useForm<IFormInput>();
  const onSubmit: SubmitHandler<IFormInput> = (data) => Mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <label>ID</label>
      <InputField register={register} name="id" placeholder="id" />

      <label>Gender Selection</label>
      <select {...register("gender")}>
        <option value="female">female</option>
        <option value="male">male</option>
        <option value="other">other</option>
      </select>

      <input type="submit" />
    </form>
  );
}
