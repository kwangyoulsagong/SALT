interface ServiceSteps {
  step: number;
  setStep: (number: number) => void;
}
const ServiceSteps = ({ step, setStep }: ServiceSteps) => {
  return <div>ServiceSteps</div>;
};
export default ServiceSteps;
