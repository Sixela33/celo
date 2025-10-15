echo "Current directory: $(pwd)"

cd "$(dirname "$0")"

frontend_dir="../../frontend/abis"

echo "Moving abis to $frontend_dir"

ls
# Create the abis directory if it doesn't exist
mkdir -p $frontend_dir

cp ../out/CrowdFundFactory.sol/CrowdFundFactory.json $frontend_dir/CrowdFundFactory.json
cp ../out/Crowdfund.sol/Crowdfund.json $frontend_dir/Crowdfund.json
